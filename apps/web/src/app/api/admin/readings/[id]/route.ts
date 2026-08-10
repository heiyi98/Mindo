import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin/requireAdmin';
import { baziRepositoryAdmin } from '@/lib/bazi/adminClient';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const reading = await baziRepositoryAdmin.getReadingDiagnostics(id);
  if (!reading) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ reading });
}
