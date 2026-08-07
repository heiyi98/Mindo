import { NextRequest, NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin/requireAdmin';
import { paymentsRepository } from '@/lib/payments/adminClient';

export async function GET() {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await paymentsRepository.listServicePrices();

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

  const { error } = await paymentsRepository.upsertServicePrice(serviceType, Number(price));

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
