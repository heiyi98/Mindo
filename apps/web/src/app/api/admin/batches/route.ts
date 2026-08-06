import { NextRequest, NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin/requireAdmin';
import { paymentsAdminClient } from '@/lib/payments/adminClient';
import { createBatch } from '@mindo/payments';

export async function GET() {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: batches, error } = await paymentsAdminClient
    .from('redemption_code_batches')
    .select('id, code_prefix, reward_type, reward_config, code_expires_at, total_count, note, created_at')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const withCounts = await Promise.all(
    (batches ?? []).map(async (batch) => {
      const { count: redeemedCount } = await paymentsAdminClient
        .from('redemption_codes')
        .select('id', { count: 'exact', head: true })
        .eq('batch_id', batch.id)
        .eq('status', 'redeemed');

      return { ...batch, redeemedCount: redeemedCount ?? 0 };
    })
  );

  return NextResponse.json({ batches: withCounts });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { codePrefix, rewardType, rewardConfig, codeExpiresAt, totalCount } = body;

  if (!rewardType || !rewardConfig || !totalCount) {
    return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
  }

  const result = await createBatch(paymentsAdminClient, {
    codePrefix: codePrefix || undefined,
    rewardType,
    rewardConfig,
    codeExpiresAt: codeExpiresAt || undefined,
    totalCount: Number(totalCount),
    createdBy: admin.id,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true, ...result.data });
}
