import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { preparePhase1Input } from '@mindo/core';

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const snapshotId = req.nextUrl.searchParams.get('snapshotId');
  if (!snapshotId) {
    return NextResponse.json({ error: 'snapshotId is required' }, { status: 400 });
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('bazi_snapshots')
    .select('calculation_result')
    .eq('id', snapshotId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 });
  }

  const phase1Input = preparePhase1Input(data.calculation_result);

  return new NextResponse(phase1Input, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
