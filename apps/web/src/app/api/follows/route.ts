import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/follows — 关注
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { targetId } = await request.json() as { targetId: string };
    if (!targetId) return NextResponse.json({ error: 'Missing targetId' }, { status: 400 });
    if (targetId === user.id) return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });

    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: user.id, following_id: targetId });

    if (error) {
      // 已关注（唯一约束冲突）视为成功
      if (error.code === '23505') return NextResponse.json({ ok: true });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[follows POST] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/follows — 取消关注
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { targetId } = await request.json() as { targetId: string };
    if (!targetId) return NextResponse.json({ error: 'Missing targetId' }, { status: 400 });

    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', targetId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[follows DELETE] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}