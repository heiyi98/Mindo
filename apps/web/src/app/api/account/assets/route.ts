import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [baziRes, westernRes] = await Promise.all([
    supabase
      .from('bazi_snapshots')
      .select('id, created_at, ai_reading, profiles(birth_date, birth_place_name)')
      .eq('user_id', user.id)
      .not('ai_reading', 'is', null)
      .order('created_at', { ascending: false }),
    supabase
      .from('astrology_snapshots')
      .select('id, created_at, ai_reading, profiles(birth_date, birth_place_name)')
      .eq('user_id', user.id)
      .not('ai_reading', 'is', null)
      .order('created_at', { ascending: false }),
  ]);

  const normalize = (rows: any[], snapshotType: string) =>
    (rows || []).map(r => ({
      id: r.id,
      snapshot_type: snapshotType,
      birth_date: r.profiles?.birth_date ?? null,
      birth_place_name: r.profiles?.birth_place_name ?? null,
      ai_reading_generated_at: r.updated_at ?? null,
      created_at: r.created_at,
    }));

  const assets = [
    ...normalize(baziRes.data ?? [], 'bazi'),
    ...normalize(westernRes.data ?? [], 'western'),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return NextResponse.json({ assets });
}
