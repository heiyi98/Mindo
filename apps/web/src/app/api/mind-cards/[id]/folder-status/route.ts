import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth/requireAuth';
import { mindCardsRepository as repo } from '@/lib/mindCards/adminClient';

// GET /api/mind-cards/:id/folder-status — 多选窗口用：当前用户所有卡片夹 + 该卡片在哪些夹里
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cardId } = await params;
    const { user } = await requireApiUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const folders = await repo.listOwnFoldersOrdered(user.id);
    const folderIds = folders.map((f) => f.id);
    const checkedIds = await repo.getFolderItemsForCard(cardId, folderIds);

    const result = folders.map((f) => ({ ...f, checked: checkedIds.has(f.id) }));
    return NextResponse.json({ folders: result });
  } catch (error) {
    console.error('[mind-cards folder-status GET] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
