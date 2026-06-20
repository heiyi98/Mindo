import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = targetUserId || user.id;

    let rows: { id: string; handle: string | null; display_name: string | null }[] = [];

    if (type === 'following') {
      // 我关注的人
      const { data } = await supabase
        .from('follows')
        .select('following:users!follows_following_id_fkey(id, handle, display_name)')
        .eq('follower_id', userId);

      rows = (data ?? []).map((r: any) => r.following).filter(Boolean);
    } else {
      // 关注我的人
      const { data } = await supabase
        .from('follows')
        .select('follower:users!follows_follower_id_fkey(id, handle, display_name)')
        .eq('following_id', userId);

      rows = (data ?? []).map((r: any) => r.follower).filter(Boolean);
    }

    // 附加当前用户对每人的关注状态
    const myFollowingIds = new Set<string>();
    if (rows.length > 0) {
      const { data: myFollows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)
        .in('following_id', rows.map(r => r.id));

      (myFollows ?? []).forEach((f: any) => myFollowingIds.add(f.following_id));
    }

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