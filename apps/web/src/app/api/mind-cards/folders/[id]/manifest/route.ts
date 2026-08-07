import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth/requireAuth';
import { mindCardsAdminClient as admin, mindCardsRepository as repo } from '@/lib/mindCards/adminClient';
import { fetchVisibleFolder, filterVisibleCards } from '@/lib/mindCards/visibility';

interface LightCard {
  id: string;
  user_id: string;
  visibility: string;
}

// GET /api/mind-cards/folders/:id/manifest — 夹内卡片的"轻量清单"：只有
// card_id/added_at/annotation，不含content/style这些重量级字段，一次性
// 返回全部（经过可见度过滤），让翻页导航能立刻知道"总共多少页"，不需要
// 等真正的卡片内容才能翻页。具体每张卡片长什么样，由/batch接口按需补。
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: folderId } = await params;
    const { user } = await requireApiUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const folder = await fetchVisibleFolder(admin, user.id, folderId);
    if (!folder) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const folderDetail = await repo.getFolderDetail(folderId);
    const rawRows = await repo.getFolderItemsWithCards(folderId);

    const typedRows = rawRows
      .map((r) => ({ addedAt: r.added_at, annotation: r.annotation, card: r.card as LightCard | null }))
      .filter((r): r is { addedAt: string; annotation: string | null; card: LightCard } => r.card !== null);

    const visibleCards = await filterVisibleCards(admin, user.id, typedRows.map((r) => r.card));
    const visibleIds = new Set(visibleCards.map((c) => c.id));

    const items = typedRows
      .filter((r) => visibleIds.has(r.card.id))
      .map((r) => ({ card_id: r.card.id, added_at: r.addedAt, annotation: r.annotation }));

    return NextResponse.json({ folder: folderDetail, items });
  } catch (error) {
    console.error('[mind-cards/folders/manifest GET] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
