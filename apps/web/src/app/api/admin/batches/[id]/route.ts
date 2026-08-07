import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin/requireAdmin';
import { paymentsRepository } from '@/lib/payments/adminClient';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const { data: batch, error: batchError } = await paymentsRepository.getBatchDetail(id);

  if (batchError || !batch) return NextResponse.json({ error: '批次不存在' }, { status: 404 });

  const { data: codes, error: codesError } = await paymentsRepository.listCodesInBatch(id);

  if (codesError) return NextResponse.json({ error: codesError.message }, { status: 500 });

  return NextResponse.json({ batch, codes });
}
