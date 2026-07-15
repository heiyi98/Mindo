import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { mindCardsAdminClient as admin } from '@/lib/mindCards/adminClient';
import { filterVisibleCards } from '@/lib/mindCards/visibility';
import { computeFavoritedSet } from '@/lib/mindCards/favorites';

const PAGE_SIZE = 20;

// GET /api/mind-cards/following?cursor=ISO时间戳 — 关注tab，按发布时间倒序，无相似度计算
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor');

    // follows 表对读取全局公开（现有 follows/list 路由已用同样的用户态client查询任意用户的关注列表）
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
    let myLikes = new Set<string>();
    if (cardIds.length > 0) {
      const { data: likes } = await admin
        .from('mind_card_likes')
        .select('card_id')
        .eq('user_id', user.id)
        .in('card_id', cardIds);
      myLikes = new Set((likes ?? []).map((l) => l.card_id));
    }
    const myFavorites = await computeFavoritedSet(admin, user.id, cardIds);

    const cards = visibleCards.map((c) => ({
      ...c,
      liked: myLikes.has(c.id),
      favorited: myFavorites.has(c.id),
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
