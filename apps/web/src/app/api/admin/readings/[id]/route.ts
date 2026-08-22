import { NextResponse } from 'next/server';
import { requireStaffAccount } from '@/lib/admin/requireStaffAccount';
import { baziRepositoryAdmin } from '@/lib/bazi/adminClient';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireStaffAccount();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const reading = await baziRepositoryAdmin.getReadingDiagnostics(id);
  if (!reading) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ reading });
}
