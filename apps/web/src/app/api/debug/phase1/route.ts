import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { preparePhase1Input } from '@mindo/core';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get('profile_id');

  if (!profileId) {
    return NextResponse.json({ error: 'profile_id required' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: snapshot } = await supabase
    .from('bazi_snapshots')
    .select('calculation_result')
    .eq('profile_id', profileId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!snapshot?.calculation_result) {
    return NextResponse.json({ error: '没有找到八字快照' }, { status: 404 });
  }

  const dataSheet = preparePhase1Input(snapshot.calculation_result);

  return new NextResponse(dataSheet, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
