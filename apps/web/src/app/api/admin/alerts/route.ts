import { NextResponse } from 'next/server';
import { requireStaffAccount } from '@/lib/admin/requireStaffAccount';
import { baziRepositoryAdmin } from '@/lib/bazi/adminClient';

export async function GET() {
  const admin = await requireStaffAccount();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const alerts = await baziRepositoryAdmin.listUnresolvedAlerts();
  return NextResponse.json({ alerts });
}
