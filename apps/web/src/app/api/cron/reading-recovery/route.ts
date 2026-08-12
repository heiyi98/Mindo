import { NextResponse } from 'next/server';
import { preparePhase1Input } from '@mindo/core';
import { paymentsRepository } from '@/lib/payments/adminClient';
import { baziRepositoryAdmin } from '@/lib/bazi/adminClient';
import { refundWallet } from '@mindo/payments';
import type { StuckReadingRow } from '@mindo/db';

// 每2分钟扫描一次（由Supabase pg_cron触发，不是Vercel自带的cron——Vercel Hobby
// 套餐的定时任务只支持一天一次，做不到2分钟级别，见Mindo-支付系统.md）。
//
// 三分类失败处理（Edge Function那边）+ 这里的重试/放弃两条路径，具体设计见
// Mindo-支付系统.md「重试引擎与失败分类」一节：
// - alert_status非空（卡在需要管理员介入的问题上）：不做次数判断，直接重触发，
//   触发成功后清空alert_status、解决对应的system_alerts记录
// - alert_status为空（普通技术性失败/内容政策失败，在正常重试范围内）：
//   retry_count>=10 或 距首次尝试超过45分钟 才算"万不得已"，触发退款+
//   标记failed_permanent+自动软删除；否则重新触发当前所在阶段
const RETRY_COUNT_LIMIT = 10;
const GIVE_UP_AFTER_MS = 45 * 60 * 1000;
const STALE_AFTER_MS = 2 * 60 * 1000;

function targetFunctionForStatus(status: string): string {
  if (status === 'theme1' || status === 'theme2' || status === 'theme3' || status === 'theme4') {
    return `generate-${status}`;
  }
  // 'generating'（刚扣款建档，还没跑过一次phase1）和 'phase1'
  // （phase1跑过但没成功写出draft）都从phase1重新开始——generate-phase1
  // 自己会检查draft是否已存在，存在就直接跳去触发theme1，是幂等的
  return 'generate-phase1';
}

async function retriggerReading(job: StuckReadingRow, supabaseUrl: string, serviceRoleKey: string) {
  const targetFunction = targetFunctionForStatus(job.ai_reading_status);
  const body =
    targetFunction === 'generate-phase1'
      ? JSON.stringify({
          readingId: job.id,
          dataSheet: preparePhase1Input(job.calculation_result as any),
          locale: job.locale,
        })
      : JSON.stringify({ readingId: job.id, locale: job.locale });

  const res = await fetch(`${supabaseUrl}/functions/v1/${targetFunction}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceRoleKey}`,
    },
    body,
  });
  // Edge Function在真正开始处理前就参数校验失败（比如payload缺字段）时会返回非2xx，
  // 但这一步本身不代表"重试失败"——它只是没能把请求交给generate-*函数的业务逻辑，
  // 跟Gemini调用失败/技术性失败是两回事，不在这里更新retry_count或alert_status。
  // 只打日志，避免这类问题（2026-08-11排查过一次：cron因为payload缺少
  // snapshotId导致generate-phase1的重试请求每次都被参数校验拒绝，但cron自己
  // 完全没检查返回状态码，一直误以为重试成功）再次发生时又要花很久才能发现。
  if (!res.ok) {
    const bodyText = await res.text().catch(() => '');
    console.error(`[Cron] ${job.id} 重新触发${targetFunction}返回非2xx：status=${res.status} body=${bodyText.slice(0, 500)}`);
  }
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // cron是服务端到服务端触发，没有真实用户session，baziRepositoryAdmin内部
  // 全程走service role，不受RLS限制
  const staleBeforeIso = new Date(Date.now() - STALE_AFTER_MS).toISOString();
  const stuckJobs = await baziRepositoryAdmin.getStuckReadings(staleBeforeIso);

  if (stuckJobs.length === 0) {
    return NextResponse.json({ message: '无卡住任务' });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const results = await Promise.allSettled(
    stuckJobs.map(async (job: StuckReadingRow) => {
      if (job.alert_status) {
        await retriggerReading(job, supabaseUrl, serviceRoleKey);
        await baziRepositoryAdmin.clearAlertStatus(job.id);
        console.log(`[Cron] ${job.id} 卡在管理员警报（${job.alert_status}），已重新触发`);
        return { id: job.id, action: 'retried_after_alert' };
      }

      const exceededRetryCount = job.retry_count >= RETRY_COUNT_LIMIT;
      const exceededTotalTime = Date.now() - new Date(job.first_attempt_at).getTime() > GIVE_UP_AFTER_MS;

      if (exceededRetryCount || exceededTotalTime) {
        if (job.charge_refunded_at) return { id: job.id, action: 'already_refunded' };

        if (job.charge_type === 'wallet' && job.charge_wallet_amount > 0) {
          await refundWallet(paymentsRepository, job.user_id, job.charge_wallet_amount, { referenceId: job.id });
        } else if (job.charge_type === 'voucher') {
          if (job.charge_voucher_id) {
            await paymentsRepository.restoreVoucherUse(job.charge_voucher_id);
          }
          if (job.charge_wallet_amount > 0) {
            await refundWallet(paymentsRepository, job.user_id, job.charge_wallet_amount, { referenceId: job.id });
          }
        }

        // 退款+标记失败+软删除一次性完成，档案立即恢复成可重新生成的状态
        await baziRepositoryAdmin.markReadingFailedPermanent(job.id);

        console.log(`[Cron] ${job.id} 重试${job.retry_count}次或超过45分钟仍未完成，已放弃并退款`);
        return { id: job.id, action: 'refunded' };
      }

      await retriggerReading(job, supabaseUrl, serviceRoleKey);
      console.log(`[Cron] 重新触发 ${job.id}，从 ${job.ai_reading_status} 继续`);
      return { id: job.id, action: 'retried' };
    })
  );

  const recovered = results.filter((r) => r.status === 'fulfilled').length;
  console.log(`[Cron] 处理了 ${recovered}/${stuckJobs.length} 个任务`);

  return NextResponse.json({ recovered, total: stuckJobs.length });
}
