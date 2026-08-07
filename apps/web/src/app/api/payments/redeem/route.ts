import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth/requireAuth';
import { paymentsRepository } from '@/lib/payments/adminClient';
import { redeemCode } from '@mindo/payments';

const ERROR_STATUS: Record<string, number> = {
  code_not_found: 404,
  already_redeemed: 409,
  code_expired: 410,
};

export async function POST(request: Request) {
  const { user } = await requireApiUser();
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const { code } = await request.json();
  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: '缺少兑换码' }, { status: 400 });
  }

  const result = await redeemCode(paymentsRepository, code.trim().toUpperCase(), user.id);
  if (!result.success) {
    return NextResponse.json({ error: result.error, code: result.code }, {
      status: ERROR_STATUS[result.code] ?? 500,
    });
  }

  return NextResponse.json({ success: true, ...result.data });
}
