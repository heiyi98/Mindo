import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { paymentsAdminClient } from '@/lib/payments/adminClient';
import { listAvailableVouchers } from '@mindo/payments';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const serviceType = request.nextUrl.searchParams.get('service_type');
  if (!serviceType) {
    return NextResponse.json({ error: '缺少service_type' }, { status: 400 });
  }

  const result = await listAvailableVouchers(paymentsAdminClient, user.id, serviceType);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ vouchers: result.data });
}
