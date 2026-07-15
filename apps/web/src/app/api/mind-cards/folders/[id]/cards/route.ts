import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { mindCardsAdminClient as admin } from '@/lib/mindCards/adminClient';
import { fetchVisibleFolder, filterVisibleCards } from '@/lib/mindCards/visibility';
import { computeFavoritedSet } from '@/lib/mindCards/favorites';

const PAGE_SIZE = 20;

// GET /api/mind-cards/folders/:id/cards?cursor=ISO时间戳 — 夹内卡片列表，双重过滤：
// ①卡片夹本身visibility对当前用户可见 ②卡片自身visibility对当前用户可见，两层都通过才返回
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: folderId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const folder = await fetchVisibleFolder(admin, user.id, folderId);
    if (!folder) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { data: folderDetail } = await admin
      .from('mind_card_folders')
      .select('id, name, description, display_mode, visibility, is_default')
      .eq('id', folderId)
      .single();

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor');

    let itemsQuery = admin
      .from('mind_card_folder_items')
      .select('added_at, mind_cards(id, user_id, content, visibility, style, created_at)')
      .eq('folder_id', folderId)
      .order('added_at', { ascending: false })
      .limit(PAGE_SIZE);

    if (cursor) itemsQuery = itemsQuery.lt('added_at', cursor);

    const { data: rows, error } = await itemsQuery;
    if (error) {
      console.error('[mind-cards/folders/cards GET] error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    type CardRow = { id: string; user_id: string; content: string; visibility: string; style: unknown; created_at: string };
    const rawCards = (rows ?? [])
      .map((r) => r.mind_cards as unknown as CardRow | null)
      .filter((c): c is CardRow => c !== null);

    const visibleCards = await filterVisibleCards(admin, user.id, rawCards);

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

    const nextCursor = rows && rows.length === PAGE_SIZE ? rows[rows.length - 1].added_at : null;

    return NextResponse.json({
      folder: folderDetail,
      cards,
      nextCursor,
    });
  } catch (error) {
    console.error('[mind-cards/folders/cards GET] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
