import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth/requireAuth';
import { mindCardsAdminClient as admin, mindCardsRepository as repo } from '@/lib/mindCards/adminClient';
import { filterVisibleCards, fetchRelationFlags } from '@/lib/mindCards/visibility';
import { computeFavoritedSet } from '@/lib/mindCards/favorites';
import { fetchAuthorMap } from '@/lib/mindCards/authors';

// GET /api/mind-cards/profile/mine?userId= — 目标用户自己创作的所有卡片（虚拟视图）
export async function GET(request: Request) {
  try {
    const { user } = await requireApiUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('userId') ?? user.id;

    const rawCards = await repo.listCardsByAuthor(targetUserId);

    const visibleCards = targetUserId === user.id
      ? rawCards
      : await filterVisibleCards(admin, user.id, rawCards);

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
