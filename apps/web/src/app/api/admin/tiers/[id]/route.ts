import { NextRequest, NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin/requireAdmin';
import { paymentsRepository } from '@/lib/payments/adminClient';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const update: { wallet_amount?: number; display_order?: number; is_active?: boolean } = {};
  if (body.walletAmount !== undefined) update.wallet_amount = Number(body.walletAmount);
  if (body.displayOrder !== undefined) update.display_order = Number(body.displayOrder);
  if (body.isActive !== undefined) update.is_active = !!body.isActive;

  const { error } = await paymentsRepository.updateTopupTier(id, update);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { error } = await paymentsRepository.deleteTopupTier(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
