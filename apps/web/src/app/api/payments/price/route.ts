import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { paymentsAdminClient } from '@/lib/payments/adminClient';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const serviceType = request.nextUrl.searchParams.get('service_type');
  if (!serviceType) return NextResponse.json({ error: '缺少service_type' }, { status: 400 });

  const { data, error } = await paymentsAdminClient
    .from('service_prices')
    .select('price')
    .eq('service_type', serviceType)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: '未配置价格' }, { status: 503 });

  return NextResponse.json({ price: data.price });
}
