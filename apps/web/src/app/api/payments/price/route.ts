import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth/requireAuth';
import { paymentsRepository } from '@/lib/payments/adminClient';

export async function GET(request: NextRequest) {
  const { user } = await requireApiUser();
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const serviceType = request.nextUrl.searchParams.get('service_type');
  if (!serviceType) return NextResponse.json({ error: '缺少service_type' }, { status: 400 });

  const { data, error } = await paymentsRepository.getServicePrice(serviceType);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: '未配置价格' }, { status: 503 });

  return NextResponse.json({ price: data.price });
}
