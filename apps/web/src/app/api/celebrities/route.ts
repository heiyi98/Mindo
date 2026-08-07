import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSocialRepository } from '@/lib/social/adminClient';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stemId = searchParams.get('stem_id');

  if (!stemId) {
    return NextResponse.json({ error: 'stem_id is required' }, { status: 400 });
  }

  const supabase = await createClient();
  const celebrities = await createSocialRepository(supabase).listCelebrities(stemId);

  return NextResponse.json({ celebrities });
}
