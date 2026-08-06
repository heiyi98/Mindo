import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin/requireAdmin';
import { paymentsAdminClient } from '@/lib/payments/adminClient';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; currencyCode: string }> }
) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, currencyCode } = await params;
  const { error } = await paymentsAdminClient
    .from('wallet_topup_tier_prices')
    .delete()
    .eq('tier_id', id)
    .eq('currency_code', currencyCode);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
