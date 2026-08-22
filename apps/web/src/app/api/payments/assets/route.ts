import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth/requireAuth';
import { paymentsRepository } from '@/lib/payments/adminClient';

export async function GET() {
  const { user } = await requireApiUser();
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const [balance, { data: vipRow }, { data: proRow }, { data: vouchers }] = await Promise.all([
    paymentsRepository.getWalletBalance(user.id),
    paymentsRepository.getUserVipExpiry(user.id),
    paymentsRepository.getUserProExpiry(user.id),
    paymentsRepository.listVouchers(user.id),
  ]);

  return NextResponse.json({
    balance,
    vipExpiresAt: vipRow?.vip_expires_at ?? null,
    proExpiresAt: proRow?.pro_expires_at ?? null,
    vouchers: vouchers ?? [],
  });
}
