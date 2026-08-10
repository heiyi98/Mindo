import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin/requireAdmin';
import { baziRepositoryAdmin } from '@/lib/bazi/adminClient';

export async function GET() {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const alerts = await baziRepositoryAdmin.listUnresolvedAlerts();
  return NextResponse.json({ alerts });
}
