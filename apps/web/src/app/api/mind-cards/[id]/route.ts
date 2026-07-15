import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { mindCardsAdminClient as admin } from '@/lib/mindCards/adminClient';
import type { CardVisibility } from '@/lib/mindCards/visibility';

const VALID_VISIBILITY: CardVisibility[] = ['private', 'followers', 'friends', 'public'];

// PATCH /api/mind-cards/:id — 仅允许改 visibility，选中即生效，不需要二次确认。
// 内容编辑（富文本重新编辑）明确排除在本次范围之外，这里不接受 content/style 字段。
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: card } = await admin
      .from('mind_cards')
      .select('id, user_id')
      .eq('id', id)
      .maybeSingle();

    if (!card || card.user_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await request.json() as { visibility?: string };
    if (!body.visibility || !VALID_VISIBILITY.includes(body.visibility as CardVisibility)) {
      return NextResponse.json({ error: 'Invalid visibility' }, { status: 400 });
    }

    const { data: updated, error } = await admin
      .from('mind_cards')
      .update({ visibility: body.visibility })
      .eq('id', id)
      .select('id, user_id, content, visibility, style, created_at')
      .single();

    if (error || !updated) {
      console.error('[mind-cards PATCH] error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    return NextResponse.json({ card: updated });
  } catch (error) {
    console.error('[mind-cards PATCH] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/mind-cards/:id — 删除自己的卡片，前端需二次确认后才调用。
// 级联删除由外键处理（folder_items/metrics/views/favorite_notifications 均已是
// on delete cascade 指向 mind_cards.id），这里只删卡片本体一行。
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: card } = await admin
      .from('mind_cards')
      .select('id, user_id')
      .eq('id', id)
      .maybeSingle();

    if (!card || card.user_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { error } = await admin.from('mind_cards').delete().eq('id', id);

    if (error) {
      console.error('[mind-cards DELETE] error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[mind-cards DELETE] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
