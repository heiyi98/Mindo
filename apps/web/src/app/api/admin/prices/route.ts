import { NextRequest, NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin/requireAdmin';
import { paymentsAdminClient } from '@/lib/payments/adminClient';

export async function GET() {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await paymentsAdminClient
    .from('service_prices')
    .select('*')
    .order('service_type', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ prices: data });
}

export async function PUT(request: NextRequest) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { serviceType, price } = await request.json();
  if (!serviceType || price === undefined) {
    return NextResponse.json({ error: '缺少serviceType或price' }, { status: 400 });
  }

  const { error } = await paymentsAdminClient
    .from('service_prices')
    .upsert({ service_type: serviceType, price: Number(price), updated_at: new Date().toISOString() });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
