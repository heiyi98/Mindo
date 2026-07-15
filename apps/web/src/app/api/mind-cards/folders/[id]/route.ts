import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { mindCardsAdminClient as admin } from '@/lib/mindCards/adminClient';
import type { CardVisibility } from '@/lib/mindCards/visibility';

const VALID_VISIBILITY: CardVisibility[] = ['private', 'followers', 'friends', 'public'];

// PATCH /api/mind-cards/folders/:id — 仅允许改 name/visibility/order_index/description。
// folder_kind/display_mode 一律忽略（创建后锁死，前端本来就不会传）。
// description 表结构里没有在需求文档的PATCH清单里明确列出，但它是本次新增的字段，
// 除了这个入口没有其他地方能编辑它，所以一并放行。
// is_default=true 的夹：name 变更同样静默忽略（不可改名，可见度仍可改）。
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: folder } = await admin
      .from('mind_card_folders')
      .select('id, user_id, is_default')
      .eq('id', id)
      .maybeSingle();

    if (!folder || folder.user_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await request.json() as {
      name?: string;
      visibility?: string;
      order_index?: number;
      description?: string;
    };

    const updates: Record<string, unknown> = {};

    if (body.name !== undefined && !folder.is_default) {
      const trimmed = body.name.trim();
      if (!trimmed) return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
      updates.name = trimmed;
    }

    if (body.visibility !== undefined) {
      if (!VALID_VISIBILITY.includes(body.visibility as CardVisibility)) {
        return NextResponse.json({ error: 'Invalid visibility' }, { status: 400 });
      }
      updates.visibility = body.visibility;
    }

    if (body.order_index !== undefined) updates.order_index = body.order_index;
    if (body.description !== undefined) updates.description = body.description.trim() || null;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: true });
    }

    const { data: updated, error } = await admin
      .from('mind_card_folders')
      .update(updates)
      .eq('id', id)
      .select('id, name, description, folder_kind, display_mode, visibility, is_default, order_index, created_at')
      .single();

    if (error || !updated) {
      console.error('[mind-cards/folders PATCH] error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    return NextResponse.json({ folder: updated });
  } catch (error) {
    console.error('[mind-cards/folders PATCH] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/mind-cards/folders/:id — 默认夹（收藏夹）拒绝删除。
// 级联删除 folder_items（FK on delete cascade），卡片本体和卡片在其他夹里的关联不受影响。
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: folder } = await admin
      .from('mind_card_folders')
      .select('id, user_id, is_default')
      .eq('id', id)
      .maybeSingle();

    if (!folder || folder.user_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (folder.is_default) {
      return NextResponse.json({ error: 'Cannot delete default folder' }, { status: 403 });
    }

    const { error } = await admin.from('mind_card_folders').delete().eq('id', id);

    if (error) {
      console.error('[mind-cards/folders DELETE] error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[mind-cards/folders DELETE] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
