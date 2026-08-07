import { NextResponse } from 'next/server';
import { mindCardsRepository as repo } from '@/lib/mindCards/adminClient';
import { CANDIDATE_POOL_WINDOW_DAYS } from '@/lib/mindCards/constants';

// GET /api/cron/mind-card-views-cleanup — 每日清理已超出候选池窗口的已读记录（Vercel Hobby cron）
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const windowStart = new Date(Date.now() - CANDIDATE_POOL_WINDOW_DAYS * 24 * 3600 * 1000).toISOString();

    const staleCardIds = await repo.listStaleCardIds(windowStart);

    if (staleCardIds.length === 0) {
      return NextResponse.json({ ok: true, deleted: 0 });
    }

    const { count, error: deleteError } = await repo.deleteViewsForCards(staleCardIds);

    if (deleteError) {
      console.error('[cron mind-card-views-cleanup] delete error:', deleteError);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, deleted: count });
  } catch (error) {
    console.error('[cron mind-card-views-cleanup] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
