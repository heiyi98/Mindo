import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin/requireAdmin';
import { paymentsAdminClient } from '@/lib/payments/adminClient';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const { data: codes, error } = await paymentsAdminClient
    .from('redemption_codes')
    .select('code')
    .eq('batch_id', id)
    .eq('status', 'unused')
    .order('code', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const csv = ['code', ...(codes ?? []).map((c) => c.code)].join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="batch-${id}-unused-codes.csv"`,
    },
  });
}
