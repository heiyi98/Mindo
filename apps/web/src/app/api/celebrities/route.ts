import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stemId = searchParams.get('stem_id');

  if (!stemId) {
    return NextResponse.json({ error: 'stem_id is required' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('celebrities')
    .select('id, name, portrait_url, display_order')
    .eq('stem_id', stemId)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    return NextResponse.json({ celebrities: [] });
  }

  return NextResponse.json({ celebrities: data || [] });
}
