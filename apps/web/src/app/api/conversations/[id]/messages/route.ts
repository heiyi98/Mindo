import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth/requireAuth';
import { createSocialRepository } from '@/lib/social/adminClient';

// GET /api/conversations/[id]/messages — 获取历史消息
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { supabase, user } = await requireApiUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const socialRepo = createSocialRepository(supabase);

    // 验证用户是参与者（绕过 RLS 循环依赖）
    const isParticipant = await socialRepo.getParticipation(id, user.id);
    if (!isParticipant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const messages = await socialRepo.listMessages(id);

    // 更新已读时间
    await socialRepo.touchLastRead(id, user.id);

    return NextResponse.json({ messages, myId: user.id });
  } catch (error) {
    console.error('[messages GET] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/conversations/[id]/messages — 发送消息
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { supabase, user } = await requireApiUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { content } = await request.json() as { content: string };
    if (!content?.trim()) return NextResponse.json({ error: 'Empty message' }, { status: 400 });

    const socialRepo = createSocialRepository(supabase);

    // 验证用户是参与者
    const isParticipant = await socialRepo.getParticipation(id, user.id);
    if (!isParticipant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: message, error: msgError } = await socialRepo.insertMessage(id, user.id, content.trim());

    if (msgError || !message) {
      console.error('[messages POST] insert error:', msgError);
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    return NextResponse.json({ message });
  } catch (error) {
    console.error('[messages POST] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
