import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { mindCardsAdminClient as admin } from '@/lib/mindCards/adminClient';
import { filterVisibleCards, fetchRelationFlags } from '@/lib/mindCards/visibility';
import { computeFavoritedSet } from '@/lib/mindCards/favorites';
import { fetchAuthorMap } from '@/lib/mindCards/authors';

interface CardRow {
  id: string;
  user_id: string;
  content: string;
  visibility: string;
  style: unknown;
  created_at: string;
}

// POST /api/mind-cards/batch — 传一批card_id，返回这些卡片的完整内容
// （content/style这些重量级字段）。用POST不用GET：传大量id放在query string
// 里容易撞网址长度上限，放在请求体里没有这个顾虑。
// 通用接口，不专属于任何一个功能——卡片集详情页用它按需补卡片内容，以后
// 其他"已经知道一批id、需要补全内容"的场景也可以直接复用，不用各自重复实现。
// 可见度重新校验一遍（不盲信调用方传来的id已经被筛过一次）——两次请求之间
// 卡片的可见度完全可能发生变化（作者改了隐私设置），这里必须自己再查一遍，
// 不能假设"清单接口当时筛过了，这次就一定还安全"。
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json() as { ids?: string[] };
    const ids = [...new Set(body?.ids ?? [])].slice(0, 100); // 单次最多100张，防止异常大批量请求
    if (ids.length === 0) return NextResponse.json({ cards: [] });

    const { data: rawCards, error } = await admin
      .from('mind_cards')
      .select('id, user_id, content, visibility, style, created_at')
      .in('id', ids);

    if (error) {
      console.error('[mind-cards/batch POST] error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    const visibleCards = await filterVisibleCards(admin, user.id, (rawCards ?? []) as CardRow[]);

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
    console.error('[mind-cards/batch POST] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}