import { NextRequest, NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin/requireAdmin';
import { paymentsAdminClient } from '@/lib/payments/adminClient';

export async function GET() {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: tiers, error } = await paymentsAdminClient
    .from('wallet_topup_tiers')
    .select('*, wallet_topup_tier_prices(*)')
    .order('display_order', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tiers });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { walletAmount, displayOrder } = await request.json();
  if (!walletAmount) return NextResponse.json({ error: '缺少walletAmount' }, { status: 400 });

  const { data, error } = await paymentsAdminClient
    .from('wallet_topup_tiers')
    .insert({ wallet_amount: Number(walletAmount), display_order: displayOrder ? Number(displayOrder) : 0 })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tier: data });
}
