import { NextRequest, NextResponse } from 'next/server';
import { requireStaffAccount } from '@/lib/admin/requireStaffAccount';
import { paymentsRepository } from '@/lib/payments/adminClient';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireStaffAccount();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { currencyCode, price } = await request.json();
  if (!currencyCode || price === undefined) {
    return NextResponse.json({ error: '缺少currencyCode或price' }, { status: 400 });
  }

  const { error } = await paymentsRepository.upsertTierPrice(id, currencyCode.toUpperCase(), Number(price));

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
