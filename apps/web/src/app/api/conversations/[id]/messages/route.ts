import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

const adminClient = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/conversations/[id]/messages — 获取历史消息
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 用 admin 验证用户是参与者（绕过 RLS 循环依赖）
    const { data: participation } = await adminClient
      .from('conversation_participants')
      .select('conversation_id')
      .eq('conversation_id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!participation) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 消息用普通客户端查（RLS 策略依赖参与者关系，已通过上面验证）
    const { data: messages } = await adminClient
      .from('messages')
      .select('id, sender_id, content, created_at')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });

    // 更新已读时间
    await adminClient
      .from('conversation_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', id)
      .eq('user_id', user.id);

    return NextResponse.json({ messages: messages ?? [], myId: user.id });
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
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { content } = await request.json() as { content: string };
    if (!content?.trim()) return NextResponse.json({ error: 'Empty message' }, { status: 400 });

    // 用 admin 验证用户是参与者
    const { data: participation } = await adminClient
      .from('conversation_participants')
      .select('conversation_id')
      .eq('conversation_id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!participation) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: message, error: msgError } = await adminClient
      .from('messages')
      .insert({
        conversation_id: id,
        sender_id: user.id,
        content: content.trim(),
      })
      .select('id, sender_id, content, created_at')
      .single();

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