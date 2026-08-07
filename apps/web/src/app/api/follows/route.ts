import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth/requireAuth';
import { createSocialRepository } from '@/lib/social/adminClient';

// POST /api/follows — 关注
export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireApiUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { targetId } = await request.json() as { targetId: string };
    if (!targetId) return NextResponse.json({ error: 'Missing targetId' }, { status: 400 });
    if (targetId === user.id) return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });

    const { error } = await createSocialRepository(supabase).follow(user.id, targetId);

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
    const { supabase, user } = await requireApiUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { targetId } = await request.json() as { targetId: string };
    if (!targetId) return NextResponse.json({ error: 'Missing targetId' }, { status: 400 });

    const { error } = await createSocialRepository(supabase).unfollow(user.id, targetId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[follows DELETE] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
