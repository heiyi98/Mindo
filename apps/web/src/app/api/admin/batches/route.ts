import { NextRequest, NextResponse } from 'next/server';
import { requireStaffAccount } from '@/lib/admin/requireStaffAccount';
import { paymentsRepository } from '@/lib/payments/adminClient';
import { createBatch, listBatchesWithCounts } from '@mindo/payments';

export async function GET() {
  const admin = await requireStaffAccount();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await listBatchesWithCounts(paymentsRepository);
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 500 });

  return NextResponse.json({ batches: result.data });
}

export async function POST(request: NextRequest) {
  const admin = await requireStaffAccount();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { codePrefix, rewardType, rewardConfig, codeExpiresAt, totalCount } = body;

  if (!rewardType || !rewardConfig || !totalCount) {
    return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
  }

  const result = await createBatch(paymentsRepository, {
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
