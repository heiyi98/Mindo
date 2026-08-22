import { NextRequest, NextResponse } from 'next/server';
import { requireStaffAccount } from '@/lib/admin/requireStaffAccount';
import { paymentsRepository } from '@/lib/payments/adminClient';
import { creditWallet, extendVip, extendPro, grantVoucher } from '@mindo/payments';

export async function POST(request: NextRequest) {
  const admin = await requireStaffAccount();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { handle, type } = body;

  if (!handle || !type) {
    return NextResponse.json({ error: '缺少handle或type' }, { status: 400 });
  }

  const targetUserId = await paymentsRepository.findUserIdByHandle(handle);

  if (!targetUserId) {
    return NextResponse.json({ error: '找不到该handle对应的用户' }, { status: 404 });
  }

  if (type === 'wallet') {
    const result = await creditWallet(paymentsRepository, targetUserId, Number(body.amount), 'admin_grant', {
      actorId: admin.id,
    });
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ success: true, balance: result.data.balance });
  }

  if (type === 'vip') {
    const result = await extendVip(paymentsRepository, targetUserId, Number(body.days), 'admin_grant', admin.id);
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ success: true, expiresAt: result.data.expiresAt });
  }

  if (type === 'pro') {
    const result = await extendPro(paymentsRepository, targetUserId, Number(body.days), 'admin_grant', admin.id);
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ success: true, expiresAt: result.data.expiresAt });
  }

  if (type === 'voucher') {
    const result = await grantVoucher(paymentsRepository, {
      userId: targetUserId,
      serviceType: body.serviceType,
      coverageType: body.coverageType,
      coverageValue: Number(body.coverageValue),
      remainingUses: body.remainingUses ? Number(body.remainingUses) : 1,
      issuerLabel: body.issuerLabel || undefined,
      actorId: admin.id,
    });
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ success: true, voucherId: result.data.id });
  }

  return NextResponse.json({ error: '未知的type' }, { status: 400 });
}
