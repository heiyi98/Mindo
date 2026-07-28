import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { mindCardsAdminClient as admin } from '@/lib/mindCards/adminClient';
import { filterVisibleCards, fetchRelationFlags } from '@/lib/mindCards/visibility';
import { computeFavoritedSet } from '@/lib/mindCards/favorites';
import { fetchAuthorMap } from '@/lib/mindCards/authors';

// GET /api/mind-cards/profile/mine?userId= — 目标用户自己创作的所有卡片（虚拟视图）
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('userId') ?? user.id;

    const { data: rawCards, error } = await admin
      .from('mind_cards')
      .select('id, user_id, content, visibility, style, created_at')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[mind-cards/profile/mine GET] error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    const visibleCards = targetUserId === user.id
      ? (rawCards ?? [])
      : await filterVisibleCards(admin, user.id, rawCards ?? []);

    const cardIds = visibleCards.map((c) => c.id);
    const myFavorites = await computeFavoritedSet(admin, user.id, cardIds);

    const authorIds = visibleCards.map((c) => c.user_id);
    const authorMap = await fetchAuthorMap(admin, authorIds);
    const relations = await fetchRelationFlags(admin, user.id, authorIds);

    const cards = visibleCards.map((c) => ({
      ...c,
      favorited: myFavorites.has(c.id),
      is_own: c.user_id === user.id,
      author: authorMap.get(c.user_id) ?? null,
      authorFollowedByViewer: relations.get(c.user_id)?.viewerFollowsAuthor ?? false,
    }));

    return NextResponse.json({ cards });
  } catch (error) {
    console.error('[mind-cards/profile/mine GET] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}