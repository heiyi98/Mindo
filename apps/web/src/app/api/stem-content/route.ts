import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stemId = searchParams.get('stem_id');
  const locale = searchParams.get('locale') || 'en';
  const contentType = searchParams.get('content_type') || 'personality_intro';

  if (!stemId) {
    return NextResponse.json({ error: 'stem_id is required' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('stem_content')
    .select('content')
    .eq('stem_id', stemId)
    .eq('locale', locale)
    .eq('content_type', contentType)
    .eq('is_published', true)
    .single();

  if (error || !data) {
    return NextResponse.json({ content: null });
  }

  return NextResponse.json({ content: data.content });
}
