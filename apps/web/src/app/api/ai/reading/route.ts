import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { preparePhase1Input } from '@mindo/core';
import { paymentsAdminClient } from '@/lib/payments/adminClient';
import { deductWallet, consumeVoucher } from '@mindo/payments';

const SERVICE_TYPE = 'bazi_report';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { snapshotId, locale, voucherId } = await request.json();
    if (!snapshotId) {
      return NextResponse.json({ error: '缺少snapshotId' }, { status: 400 });
    }

    // 读取八字快照
    const { data: snapshot, error: snapError } = await supabase
      .from('bazi_snapshots')
      .select('id, calculation_result, user_id, profile_id')
      .eq('id', snapshotId)
      .eq('user_id', user.id)
      .single();

    if (snapError || !snapshot) {
      return NextResponse.json({ error: '快照不存在' }, { status: 404 });
    }

    // 读取档案出生信息（生成时快照）
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, birth_date, birth_time, birth_lat, birth_lng, birth_place_name, gender')
      .eq('id', snapshot.profile_id)
      .single();

    // 确定报告语言：优先用传入的locale，兜底用zh
    const reportLocale = locale ?? 'zh';

    // 生成时预先分配readingId，作为这笔扣款的reference_id，
    // 报告记录本身还没创建也可以先把扣款和它关联起来
    const readingId = crypto.randomUUID();

    let chargeType: 'wallet' | 'voucher';
    let chargeWalletAmount = 0;

    if (voucherId) {
      const voucherResult = await consumeVoucher(paymentsAdminClient, voucherId, user.id, readingId);
      if (!voucherResult.success) {
        return NextResponse.json({ error: voucherResult.error, code: voucherResult.code }, { status: 402 });
      }
      chargeType = 'voucher';
      chargeWalletAmount = voucherResult.data.selfPayAmount;
    } else {
      // service_prices没开RLS也没有对应的grant策略，用session client（anon/authenticated
      // 角色）查会被静默拒绝返回空结果——不是报错，是查不到行，之前误用session client
      // 查过这张表，表现就是"明明后台已经配置了价格，这里还是报未配置"。跟其他payment表
      // 一样统一用service role的paymentsAdminClient
      const { data: priceRow, error: priceError } = await paymentsAdminClient
        .from('service_prices')
        .select('price')
        .eq('service_type', SERVICE_TYPE)
        .maybeSingle();

      if (priceError || !priceRow) {
        // 这是"价目表还没配置"，不是服务器崩溃，503比500更准确，
        // 也方便前端/日志一眼区分这类"待配置"状态和真正的代码报错
        return NextResponse.json({ error: '未配置八字报告价格' }, { status: 503 });
      }

      const deductResult = await deductWallet(paymentsAdminClient, user.id, priceRow.price, 'ai_generation', {
        referenceId: readingId,
      });
      if (!deductResult.success) {
        return NextResponse.json({ error: deductResult.error, code: deductResult.code }, { status: 402 });
      }
      chargeType = 'wallet';
      chargeWalletAmount = priceRow.price;
    }

    // 在 bazi_readings 创建新记录
    // calculation_result：把这次的命盘计算结果原样复制一份，钉死在报告自己
    // 身上——之后渲染报告命盘图表只读这一份自留副本，不再跨表查
    // bazi_snapshots，报告从此不依赖档案/快照后续会不会被改动或删除。
    //
    // 注意：这里必须用paymentsAdminClient（service role），不能用session client。
    // bazi_readings对owner开了INSERT策略是历史遗留（早于这套付费系统），只要还留着，
    // 任何登录用户都能在浏览器控制台直接调supabase.from('bazi_readings').insert()绕过
    // 这整个接口和上面的扣款逻辑，自己造一行'generating'状态的记录，等 reading-recovery
    // 这个cron五分钟后捡到就会免费触发生成。用service role client写、并把RLS收紧成
    // 只保留SELECT策略（见Mindo-支付系统.md），才能把这条路堵死。
    const { data: reading, error: readingError } = await paymentsAdminClient
      .from('bazi_readings')
      .insert({
        id: readingId,
        user_id: user.id,
        profile_id: snapshot.profile_id,
        profile_display_name: profile?.display_name ?? null,
        birth_date: profile?.birth_date ?? null,
        birth_time: profile?.birth_time ?? null,
        birth_lat: profile?.birth_lat ?? null,
        birth_lng: profile?.birth_lng ?? null,
        birth_place_name: profile?.birth_place_name ?? null,
        birth_gender: profile?.gender ?? null,
        calculation_result: snapshot.calculation_result,
        locale: reportLocale,
        ai_reading_status: 'generating',
        charge_type: chargeType,
        charge_wallet_amount: chargeWalletAmount,
        charge_voucher_id: voucherId ?? null,
      })
      .select('id')
      .single();

    if (readingError || !reading) {
      // 报告记录都没建成，生成根本没开始，扣的钱/凭证要立刻退回去
      if (chargeWalletAmount > 0) {
        await paymentsAdminClient.rpc('credit_wallet', {
          p_user_id: user.id,
          p_amount: chargeWalletAmount,
          p_type: 'refund',
          p_reference_id: readingId,
          p_actor_id: null,
        });
      }
      if (voucherId) {
        await paymentsAdminClient.rpc('restore_voucher_use', { p_voucher_id: voucherId });
      }
      return NextResponse.json({ error: '创建报告记录失败' }, { status: 500 });
    }

    // 生成数据清单
    const dataSheet = preparePhase1Input(snapshot.calculation_result);

    const edgeFunctionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-phase1`;

    fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ snapshotId, readingId: reading.id, dataSheet, locale: reportLocale }),
    }).catch(err => console.error('Edge Function触发失败:', err));

    return NextResponse.json({ success: true, readingId: reading.id, message: '报告生成中' });

  } catch (error: any) {
    console.error('触发报告生成失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
