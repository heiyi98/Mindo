import { NextRequest, NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin/requireAdmin';
import { paymentsRepository } from '@/lib/payments/adminClient';

export async function GET(request: NextRequest) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const email = request.nextUrl.searchParams.get('email');
  if (!email) return NextResponse.json({ error: '缺少email' }, { status: 400 });

  const { data: targetUser, error: userError } = await paymentsRepository.findUserByEmail(email);

  if (userError) return NextResponse.json({ error: userError.message }, { status: 500 });
  if (!targetUser) return NextResponse.json({ error: '找不到该邮箱对应的用户' }, { status: 404 });

  const [wallet, vouchers] = await Promise.all([
    paymentsRepository.getWalletDetail(targetUser.id),
    paymentsRepository.listAllVouchersForAdmin(targetUser.id),
  ]);

  return NextResponse.json({
    user: targetUser,
    balance: wallet?.balance ?? 0,
    vouchers: vouchers ?? [],
  });
}
