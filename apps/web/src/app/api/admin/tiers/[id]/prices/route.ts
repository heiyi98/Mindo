import { NextRequest, NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin/requireAdmin';
import { paymentsAdminClient } from '@/lib/payments/adminClient';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { currencyCode, price } = await request.json();
  if (!currencyCode || price === undefined) {
    return NextResponse.json({ error: '缺少currencyCode或price' }, { status: 400 });
  }

  const { error } = await paymentsAdminClient.from('wallet_topup_tier_prices').upsert({
    tier_id: id,
    currency_code: currencyCode.toUpperCase(),
    price: Number(price),
    updated_at: new Date().toISOString(),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
