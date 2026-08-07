import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSocialRepository } from '@/lib/social/adminClient';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stemId = searchParams.get('stem_id');
  const locale = searchParams.get('locale') || 'en';
  const contentType = searchParams.get('content_type') || 'personality_intro';

  if (!stemId) {
    return NextResponse.json({ error: 'stem_id is required' }, { status: 400 });
  }

  const supabase = await createClient();
  const content = await createSocialRepository(supabase).getStemContent(stemId, locale, contentType);

  return NextResponse.json({ content });
}
