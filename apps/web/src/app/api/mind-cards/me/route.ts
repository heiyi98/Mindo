import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth/requireAuth';
import { mindCardsRepository as repo } from '@/lib/mindCards/adminClient';

// GET /api/mind-cards/me — 当前登录用户自己的handle/display_name。
// 用途：发留言/回复时做"乐观更新"（立刻把这条显示在界面上，不等后端确认），
// 需要立刻知道作者名字该显示什么，这个接口就是给这种场景用的，通用、不专属
// 于留言功能，以后别处需要"我自己的展示名"也可以直接复用。
export async function GET() {
  try {
    const { user } = await requireApiUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const data = await repo.getUserHandle(user.id);

    return NextResponse.json({
      id: user.id,
      handle: data?.handle ?? '',
      display_name: data?.display_name ?? null,
    });
  } catch (error) {
    console.error('[mind-cards/me GET] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
