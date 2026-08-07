import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth/requireAuth';
import { mindCardsAdminClient as admin, mindCardsRepository as repo } from '@/lib/mindCards/adminClient';
import { fetchVisibleFolder } from '@/lib/mindCards/visibility';

// POST /api/mind-cards/folders/:id/subscribe — 订阅指定夹
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: folderId } = await params;
    const { user } = await requireApiUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const folder = await fetchVisibleFolder(admin, user.id, folderId);
    if (!folder) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { error } = await repo.insertFolderSubscription(folderId, user.id);

    if (error) {
      if (error.code === '23505') return NextResponse.json({ ok: true });
      console.error('[mind-cards folders subscribe POST] error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[mind-cards folders subscribe POST] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/mind-cards/folders/:id/subscribe — 取消订阅
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: folderId } = await params;
    const { user } = await requireApiUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { error } = await repo.deleteFolderSubscription(folderId, user.id);

    if (error) {
      console.error('[mind-cards folders subscribe DELETE] error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[mind-cards folders subscribe DELETE] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
