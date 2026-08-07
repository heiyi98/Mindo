import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth/requireAuth';
import { createSocialRepository } from '@/lib/social/adminClient';

// GET /api/conversations — 当前用户的会话列表
export async function GET() {
  try {
    const { supabase, user } = await requireApiUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const socialRepo = createSocialRepository(supabase);

    // 查询当前用户参与的所有会话
    const participations = await socialRepo.listMyParticipations(user.id);

    if (participations.length === 0) {
      return NextResponse.json({ conversations: [] });
    }

    const conversationIds = participations.map((p) => p.conversation_id);

    const [otherParticipantMap, lastMessageMap] = await Promise.all([
      socialRepo.listOtherParticipants(conversationIds, user.id),
      socialRepo.listLastMessages(conversationIds),
    ]);

    const conversations = conversationIds
      .map((id) => ({
        id,
        other: otherParticipantMap.get(id) ?? null,
        lastMessage: lastMessageMap.get(id) ?? null,
      }))
      .filter((c) => c.other !== null)
      .sort((a, b) => {
        const ta = a.lastMessage?.created_at ?? '';
        const tb = b.lastMessage?.created_at ?? '';
        return tb.localeCompare(ta);
      });

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('[conversations GET] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/conversations — 查找或创建与目标用户的会话
export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireApiUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { targetUserId } = await request.json() as { targetUserId: string };
    if (!targetUserId) return NextResponse.json({ error: 'Missing targetUserId' }, { status: 400 });
    if (targetUserId === user.id) return NextResponse.json({ error: 'Cannot message yourself' }, { status: 400 });

    const socialRepo = createSocialRepository(supabase);

    // 查找是否已有两人之间的会话
    const myParticipations = await socialRepo.listMyParticipations(user.id);
    const myConvIds = myParticipations.map((p) => p.conversation_id);

    const existingConvId = await socialRepo.findExistingConversationId(myConvIds, targetUserId);
    if (existingConvId) {
      return NextResponse.json({ conversationId: existingConvId });
    }

    // 创建新会话
    const { data: newConv, error: convError } = await socialRepo.createConversation();

    if (convError || !newConv) {
      console.error('[conversations POST] create conv error:', convError);
      return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
    }

    // 添加两个参与者
    const { error: partError } = await socialRepo.addParticipants(newConv.id, [user.id, targetUserId]);

    if (partError) {
      console.error('[conversations POST] add participants error:', partError);
      return NextResponse.json({ error: 'Failed to add participants' }, { status: 500 });
    }

    return NextResponse.json({ conversationId: newConv.id });
  } catch (error) {
    console.error('[conversations POST] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
