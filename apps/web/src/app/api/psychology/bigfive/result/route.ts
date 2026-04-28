import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get('profile_id');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!profileId) {
    return NextResponse.json({ error: 'profile_id required' }, { status: 400 });
  }

  const { data: snapshot } = await supabase
    .from('snapshots')
    .select('calculation_result')
    .eq('profile_id', profileId)
    .eq('snapshot_type', 'bigfive')
    .single();

  if (!snapshot) {
    return NextResponse.json({ result: null });
  }

  return NextResponse.json({ result: snapshot.calculation_result });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get('profile_id');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!profileId) {
    return NextResponse.json({ error: 'profile_id required' }, { status: 400 });
  }

  await supabase
    .from('snapshots')
    .delete()
    .eq('profile_id', profileId)
    .eq('snapshot_type', 'bigfive');

  return NextResponse.json({ success: true });
}
