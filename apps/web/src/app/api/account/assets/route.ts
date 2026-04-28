import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: assets } = await supabase
    .from('snapshots')
    .select('id, snapshot_type, birth_date, birth_place_name, ai_reading_generated_at, created_at')
    .eq('user_id', user.id)
    .not('ai_reading', 'is', null)
    .order('created_at', { ascending: false });

  return NextResponse.json({ assets: assets || [] });
}
