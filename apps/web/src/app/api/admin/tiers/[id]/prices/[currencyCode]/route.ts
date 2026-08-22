import { NextResponse } from 'next/server';
import { requireStaffAccount } from '@/lib/admin/requireStaffAccount';
import { paymentsRepository } from '@/lib/payments/adminClient';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; currencyCode: string }> }
) {
  const admin = await requireStaffAccount();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, currencyCode } = await params;
  const { error } = await paymentsRepository.deleteTierPrice(id, currencyCode);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
