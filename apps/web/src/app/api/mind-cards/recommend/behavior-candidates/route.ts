import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth/requireAuth';
import { mindCardsAdminClient as admin } from '@/lib/mindCards/adminClient';
import { computeBehaviorCandidateAuthors } from '@/lib/mindCards/behaviorCandidates';

// GET /api/mind-cards/recommend/behavior-candidates?userId= — "行为共现"研究工具，
// 内部使用，不接入任何普通用户界面。默认查当前登录用户自己的共现结果，传
// ?userId=可以查任意用户（供研究不同用户的共现效果用，登录即可调，不做额外
// 的管理员门槛——这次先不做，见 Mindo-片语.md 第三十四节施工顺序）。
export async function GET(request: Request) {
  try {
    const { user } = await requireApiUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('userId') ?? user.id;

    const authors = await computeBehaviorCandidateAuthors(admin, targetUserId);

    return NextResponse.json({ userId: targetUserId, authors });
  } catch (error) {
    console.error('[mind-cards/recommend/behavior-candidates GET] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
