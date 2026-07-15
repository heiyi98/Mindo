import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { mindCardsAdminClient as admin } from '@/lib/mindCards/adminClient';
import { fetchVisibleCard } from '@/lib/mindCards/visibility';

// POST /api/mind-cards/[id]/like — 点赞
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const card = await fetchVisibleCard(admin, user.id, id);
    if (!card) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { error } = await admin
      .from('mind_card_likes')
      .insert({ card_id: id, user_id: user.id });

    if (error) {
      // 已点赞（组合主键冲突）视为成功
      if (error.code === '23505') return NextResponse.json({ ok: true });
      console.error('[mind-cards like POST] error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[mind-cards like POST] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/mind-cards/[id]/like — 取消点赞
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { error } = await admin
      .from('mind_card_likes')
      .delete()
      .eq('card_id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('[mind-cards like DELETE] error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[mind-cards like DELETE] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
