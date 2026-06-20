import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

const adminClient = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/conversations — 当前用户的会话列表
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 查询当前用户参与的所有会话（admin 绕过 RLS）
    const { data: participations } = await adminClient
      .from('conversation_participants')
      .select('conversation_id, last_read_at')
      .eq('user_id', user.id);

    if (!participations || participations.length === 0) {
      return NextResponse.json({ conversations: [] });
    }

    const conversationIds = participations.map((p: any) => p.conversation_id);

    // 查询每个会话的对方参与者（admin 绕过 RLS）
    const { data: allParticipants } = await adminClient
      .from('conversation_participants')
      .select('conversation_id, user_id, users(id, display_name, handle)')
      .in('conversation_id', conversationIds)
      .neq('user_id', user.id);

    // 查询每个会话的最后一条消息（admin 绕过 RLS）
    const { data: lastMessages } = await adminClient
      .from('messages')
      .select('conversation_id, content, created_at')
      .in('conversation_id', conversationIds)
      .order('created_at', { ascending: false });

    // 组装结果
    const lastMessageMap = new Map<string, { content: string; created_at: string }>();
    for (const msg of lastMessages ?? []) {
      if (!lastMessageMap.has(msg.conversation_id)) {
        lastMessageMap.set(msg.conversation_id, {
          content: msg.content,
          created_at: msg.created_at,
        });
      }
    }

    const otherParticipantMap = new Map<string, { id: string; display_name: string | null; handle: string | null }>();
    for (const p of allParticipants ?? []) {
      if (!otherParticipantMap.has(p.conversation_id)) {
        const u = p.users as any;
        otherParticipantMap.set(p.conversation_id, {
          id: u.id,
          display_name: u.display_name,
          handle: u.handle,
        });
      }
    }

    const conversations = conversationIds
      .map((id: string) => ({
        id,
        other: otherParticipantMap.get(id) ?? null,
        lastMessage: lastMessageMap.get(id) ?? null,
      }))
      .filter((c: any) => c.other !== null)
      .sort((a: any, b: any) => {
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
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { targetUserId } = await request.json() as { targetUserId: string };
    if (!targetUserId) return NextResponse.json({ error: 'Missing targetUserId' }, { status: 400 });
    if (targetUserId === user.id) return NextResponse.json({ error: 'Cannot message yourself' }, { status: 400 });

    // 查找是否已有两人之间的会话（admin 绕过 RLS）
    const { data: myParticipations } = await adminClient
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id);

    const myConvIds = (myParticipations ?? []).map((p: any) => p.conversation_id);

    if (myConvIds.length > 0) {
      const { data: existing } = await adminClient
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', targetUserId)
        .in('conversation_id', myConvIds)
        .maybeSingle();

      if (existing) {
        return NextResponse.json({ conversationId: existing.conversation_id });
      }
    }

    // 创建新会话（admin 绕过 RLS）
    const { data: newConv, error: convError } = await adminClient
      .from('conversations')
      .insert({})
      .select('id')
      .single();

    if (convError || !newConv) {
      console.error('[conversations POST] create conv error:', convError);
      return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
    }

    // 添加两个参与者（admin 绕过 RLS）
    const { error: partError } = await adminClient
      .from('conversation_participants')
      .insert([
        { conversation_id: newConv.id, user_id: user.id },
        { conversation_id: newConv.id, user_id: targetUserId },
      ]);

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