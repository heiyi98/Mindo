import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { mindCardsAdminClient as admin } from '@/lib/mindCards/adminClient';
import { filterVisibleCards } from '@/lib/mindCards/visibility';
import { computeFavoritedSet } from '@/lib/mindCards/favorites';

// GET /api/mind-cards/profile/mine?userId= — 目标用户自己创作的所有卡片（虚拟视图，"我的卡片"栏）
// userId 省略时默认当前用户。本轮前端只会以自己身份调用，但接口本身已支持将来查看他人主页复用。
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

    return NextResponse.json({ cards });
  } catch (error) {
    console.error('[mind-cards/profile/mine GET] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
