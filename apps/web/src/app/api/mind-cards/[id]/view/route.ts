import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth/requireAuth';
import { mindCardsAdminClient as admin, mindCardsRepository as repo } from '@/lib/mindCards/adminClient';
import { fetchVisibleCard } from '@/lib/mindCards/visibility';

// POST /api/mind-cards/[id]/view — 标记已读（推荐tab去重用）
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user } = await requireApiUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const card = await fetchVisibleCard(admin, user.id, id);
    if (!card) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { error } = await repo.markCardViewed(id, user.id);

    if (error) {
      console.error('[mind-cards view POST] error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[mind-cards view POST] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
