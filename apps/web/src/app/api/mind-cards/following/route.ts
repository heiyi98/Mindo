import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { mindCardsAdminClient as admin } from '@/lib/mindCards/adminClient';
import { filterVisibleCards } from '@/lib/mindCards/visibility';
import { computeFavoritedSet } from '@/lib/mindCards/favorites';
import { fetchAuthorMap } from '@/lib/mindCards/authors';

const PAGE_SIZE = 20;

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor');

    const { data: followingRows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id);

    const authorIds = (followingRows ?? []).map((r) => r.following_id);
    if (authorIds.length === 0) {
      return NextResponse.json({ cards: [], nextCursor: null });
    }

    let query = admin
      .from('mind_cards')
      .select('id, user_id, content, visibility, style, created_at')
      .in('user_id', authorIds)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);

    if (cursor) query = query.lt('created_at', cursor);

    const { data: rawCards, error: cardsError } = await query;
    if (cardsError) {
      console.error('[mind-cards/following GET] cards error:', cardsError);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    const visibleCards = await filterVisibleCards(admin, user.id, rawCards ?? []);

    const cardIds = visibleCards.map((c) => c.id);
    const myFavorites = await computeFavoritedSet(admin, user.id, cardIds);

    // 关注tab里的卡片，作者本来就是"我关注的人"，authorFollowedByViewer
    // 恒为true，不需要额外查一次关注关系
    const authorMap = await fetchAuthorMap(admin, visibleCards.map((c) => c.user_id));

    const cards = visibleCards.map((c) => ({
      ...c,
      favorited: myFavorites.has(c.id),
      is_own: c.user_id === user.id,
      author: authorMap.get(c.user_id) ?? null,
      authorFollowedByViewer: true,
    }));

    const nextCursor = rawCards && rawCards.length === PAGE_SIZE
      ? rawCards[rawCards.length - 1].created_at
      : null;

    return NextResponse.json({ cards, nextCursor });
  } catch (error) {
    console.error('[mind-cards/following GET] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}