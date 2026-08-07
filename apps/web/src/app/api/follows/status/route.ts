import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth/requireAuth';
import { createSocialRepository } from '@/lib/social/adminClient';

// GET /api/follows/status?targetId=xxx
// 返回 { iFollow: bool, theyFollow: bool, isSelf: bool }
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const targetId = searchParams.get('targetId');
    if (!targetId) return NextResponse.json({ error: 'Missing targetId' }, { status: 400 });

    const { supabase, user } = await requireApiUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (targetId === user.id) {
      return NextResponse.json({ isSelf: true, iFollow: false, theyFollow: false });
    }

    const socialRepo = createSocialRepository(supabase);
    const [iFollow, theyFollow] = await Promise.all([
      socialRepo.getFollowEdge(user.id, targetId),
      socialRepo.getFollowEdge(targetId, user.id),
    ]);

    return NextResponse.json({
      isSelf: false,
      iFollow,
      theyFollow,
    });
  } catch (error) {
    console.error('[follows/status] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
