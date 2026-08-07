import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth/requireAuth';
import { mindCardsAdminClient as admin, mindCardsRepository as repo } from '@/lib/mindCards/adminClient';
import { createSocialRepository } from '@/lib/social/adminClient';
import { filterVisibleCards } from '@/lib/mindCards/visibility';
import { computeFavoritedSet } from '@/lib/mindCards/favorites';
import { fetchAuthorMap } from '@/lib/mindCards/authors';

const PAGE_SIZE = 20;

export async function GET(request: Request) {
  try {
    const { supabase, user } = await requireApiUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor');

    const followingUsers = await createSocialRepository(supabase).listFollowing(user.id);
    const authorIds = followingUsers.map((r) => r.id);
    if (authorIds.length === 0) {
      return NextResponse.json({ cards: [], nextCursor: null });
    }

    const rawCards = await repo.listCardsByAuthors(authorIds, cursor, PAGE_SIZE);

    const visibleCards = await filterVisibleCards(admin, user.id, rawCards);

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

    const nextCursor = rawCards.length === PAGE_SIZE
      ? rawCards[rawCards.length - 1].created_at
      : null;

    return NextResponse.json({ cards, nextCursor });
  } catch (error) {
    console.error('[mind-cards/following GET] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
