import { NextRequest, NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin/requireAdmin';
import { paymentsAdminClient } from '@/lib/payments/adminClient';

export async function GET(request: NextRequest) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const email = request.nextUrl.searchParams.get('email');
  if (!email) return NextResponse.json({ error: '缺少email' }, { status: 400 });

  const { data: targetUser, error: userError } = await paymentsAdminClient
    .from('users')
    .select('id, email, handle, vip_expires_at')
    .eq('email', email)
    .maybeSingle();

  if (userError) return NextResponse.json({ error: userError.message }, { status: 500 });
  if (!targetUser) return NextResponse.json({ error: '找不到该邮箱对应的用户' }, { status: 404 });

  const [{ data: wallet }, { data: vouchers }] = await Promise.all([
    paymentsAdminClient.from('wallets').select('balance, updated_at').eq('user_id', targetUser.id).maybeSingle(),
    paymentsAdminClient
      .from('service_coverage_vouchers')
      .select('*')
      .eq('user_id', targetUser.id)
      .order('created_at', { ascending: false }),
  ]);

  return NextResponse.json({
    user: targetUser,
    balance: wallet?.balance ?? 0,
    vouchers: vouchers ?? [],
  });
}
