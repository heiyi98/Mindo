import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth/requireAuth';
import { mindCardsRepository as repo } from '@/lib/mindCards/adminClient';

// POST /api/mind-cards/notifications/read-all — 清扫：把当前用户所有未读通知
// 一次性标成已读。不做单条已读、不做删除。
export async function POST() {
  try {
    const { user } = await requireApiUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { error } = await repo.markAllNotificationsRead(user.id);

    if (error) {
      console.error('[mind-cards/notifications/read-all POST] error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[mind-cards/notifications/read-all POST] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
