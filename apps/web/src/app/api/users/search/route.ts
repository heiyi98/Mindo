import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth/requireAuth';
import { createSocialRepository } from '@/lib/social/adminClient';

// GET /api/users/search?q=xxx
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim();
    // 默认排除自己（"加好友"场景不该搜到自己）；"直接发放"这类管理员操作场景
    // 需要搜到自己（给自己账号发测试额度），显式传excludeSelf=false跳过这条过滤，
    // 不改动这个接口原本对私信模块的默认行为
    const excludeSelf = searchParams.get('excludeSelf') !== 'false';

    if (!q || q.length < 1) {
      return NextResponse.json({ users: [] });
    }

    const { supabase, user } = await requireApiUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const users = await createSocialRepository(supabase).searchUsers(q, excludeSelf ? user.id : null);

    return NextResponse.json({ users });
  } catch (error) {
    console.error('[users/search] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
