import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/follows/status?targetId=xxx
// 返回 { iFollow: bool, theyFollow: bool, isSelf: bool }
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const targetId = searchParams.get('targetId');
    if (!targetId) return NextResponse.json({ error: 'Missing targetId' }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (targetId === user.id) {
      return NextResponse.json({ isSelf: true, iFollow: false, theyFollow: false });
    }

    const [{ data: iFollowRow }, { data: theyFollowRow }] = await Promise.all([
      supabase
        .from('follows')
        .select('follower_id')
        .eq('follower_id', user.id)
        .eq('following_id', targetId)
        .maybeSingle(),
      supabase
        .from('follows')
        .select('follower_id')
        .eq('follower_id', targetId)
        .eq('following_id', user.id)
        .maybeSingle(),
    ]);

    return NextResponse.json({
      isSelf: false,
      iFollow: !!iFollowRow,
      theyFollow: !!theyFollowRow,
    });
  } catch (error) {
    console.error('[follows/status] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}