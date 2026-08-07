import { NextResponse } from 'next/server';
import { preparePhase1Input } from '@mindo/core';
import { paymentsRepository } from '@/lib/payments/adminClient';
import { baziRepositoryAdmin } from '@/lib/bazi/adminClient';
import { refundWallet } from '@mindo/payments';
import type { StuckReadingRow } from '@mindo/db';

// Vercel Cron Job - 每5分钟扫描卡住的报告任务
//
// 真正的生成状态存在 bazi_readings 上（ai_reading_status/ai_reading_draft/
// ai_reading_theme1-4），bazi_snapshots 上同名字段是迁移前的死字段——这里改
// 成查 bazi_readings，此前这个cron实际上从未真正找到过卡住的任务。
//
// 超过30分钟还没完成的任务视为彻底失败：标记 failed_permanent，
// 并把当初扣的虚拟币/凭证使用次数退还（charge_refunded_at 防止重复退款）。
const GIVE_UP_AFTER_MS = 30 * 60 * 1000;

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // cron是服务端到服务端触发（Vercel带CRON_SECRET调用），没有真实用户session，
  // 用session client查/改bazi_readings在RLS收紧成"仅owner可SELECT"之后会永远
  // 查到空结果（auth.uid()是null，匹配不上任何user_id）——baziRepositoryAdmin
  // 内部全程走service role，不受RLS限制
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const stuckJobs = await baziRepositoryAdmin.getStuckReadings(fiveMinutesAgo);

  if (stuckJobs.length === 0) {
    return NextResponse.json({ message: '无卡住任务' });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const results = await Promise.allSettled(
    stuckJobs.map(async (job: StuckReadingRow) => {
      const elapsed = Date.now() - new Date(job.created_at).getTime();

      if (elapsed > GIVE_UP_AFTER_MS) {
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

        await baziRepositoryAdmin.markReadingFailedPermanent(job.id);

        console.log(`[Cron] ${job.id} 超过30分钟未完成，已放弃并退款`);
        return { id: job.id, action: 'refunded' };
      }

      // 根据已完成的阶段决定从哪里继续
      let targetFunction = 'generate-phase1';
      if (job.ai_reading_theme3) targetFunction = 'generate-theme4';
      else if (job.ai_reading_theme2) targetFunction = 'generate-theme3';
      else if (job.ai_reading_theme1) targetFunction = 'generate-theme2';
      else if (job.ai_reading_draft) targetFunction = 'generate-theme1';

      console.log(`[Cron] 重新触发 ${job.id}，从 ${targetFunction} 继续`);

      const body =
        targetFunction === 'generate-phase1'
          ? JSON.stringify({
              readingId: job.id,
              dataSheet: preparePhase1Input(job.calculation_result as any),
              locale: job.locale,
            })
          : JSON.stringify({ readingId: job.id });

      await fetch(`${supabaseUrl}/functions/v1/${targetFunction}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
        body,
      });

      return { id: job.id, action: 'retried' };
    })
  );

  const recovered = results.filter((r) => r.status === 'fulfilled').length;
  console.log(`[Cron] 处理了 ${recovered}/${stuckJobs.length} 个任务`);

  return NextResponse.json({ recovered, total: stuckJobs.length });
}
