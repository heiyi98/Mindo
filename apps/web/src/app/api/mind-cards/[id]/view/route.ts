import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { mindCardsAdminClient as admin } from '@/lib/mindCards/adminClient';
import { fetchVisibleCard } from '@/lib/mindCards/visibility';

// POST /api/mind-cards/[id]/view — 标记已读（推荐tab去重用）
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const card = await fetchVisibleCard(admin, user.id, id);
    if (!card) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { error } = await admin
      .from('mind_card_views')
      .upsert(
        { card_id: id, viewer_id: user.id, viewed_at: new Date().toISOString() },
        { onConflict: 'card_id,viewer_id', ignoreDuplicates: true }
      );

    if (error) {
      console.error('[mind-cards view POST] error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[mind-cards view POST] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
