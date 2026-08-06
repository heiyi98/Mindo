import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { paymentsAdminClient } from '@/lib/payments/adminClient';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const [{ data: wallet }, { data: userRow }, { data: vouchers }] = await Promise.all([
    paymentsAdminClient.from('wallets').select('balance').eq('user_id', user.id).maybeSingle(),
    paymentsAdminClient.from('users').select('vip_expires_at').eq('id', user.id).maybeSingle(),
    paymentsAdminClient
      .from('service_coverage_vouchers')
      .select('*')
      .eq('user_id', user.id)
      .gt('remaining_uses', 0)
      .order('created_at', { ascending: true }),
  ]);

  return NextResponse.json({
    balance: wallet?.balance ?? 0,
    vipExpiresAt: userRow?.vip_expires_at ?? null,
    vouchers: vouchers ?? [],
  });
}
