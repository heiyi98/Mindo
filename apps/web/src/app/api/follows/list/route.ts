import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth/requireAuth';
import { createSocialRepository } from '@/lib/social/adminClient';

// GET /api/follows/list?type=following|followers&userId=xxx
// userId 不传则默认当前用户
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'following' | 'followers' | null;
    const targetUserId = searchParams.get('userId');

    if (!type || !['following', 'followers'].includes(type)) {
      return NextResponse.json({ error: 'Missing or invalid type' }, { status: 400 });
    }

    const { supabase, user } = await requireApiUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = targetUserId || user.id;
    const socialRepo = createSocialRepository(supabase);

    const rows = type === 'following'
      ? await socialRepo.listFollowing(userId)  // 我关注的人
      : await socialRepo.listFollowers(userId); // 关注我的人

    // 附加当前用户对每人的关注状态
    const myFollowingIds = rows.length > 0
      ? await socialRepo.listMyFollowingIds(user.id, rows.map(r => r.id))
      : new Set<string>();

    const result = rows.map(r => ({
      id: r.id,
      handle: r.handle,
      displayName: r.display_name,
      iFollow: myFollowingIds.has(r.id),
    }));

    return NextResponse.json({ list: result });
  } catch (error) {
    console.error('[follows/list] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
