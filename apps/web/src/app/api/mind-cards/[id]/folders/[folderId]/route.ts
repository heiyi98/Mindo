import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { mindCardsAdminClient as admin } from '@/lib/mindCards/adminClient';
import { fetchVisibleCard } from '@/lib/mindCards/visibility';

// POST /api/mind-cards/:id/folders/:folderId — 把卡片加入指定夹（只能加进自己的夹）。
// annotation：可选，只有目标夹是'本'（folder_kind='notebook'）时前端才会传，
// 后端不强制校验folder_kind一致性——传了就存，卡册/卡夹传annotation本身无害。
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; folderId: string }> }
) {
  try {
    const { id: cardId, folderId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const card = await fetchVisibleCard(admin, user.id, cardId);
    if (!card) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { data: folder } = await admin
      .from('mind_card_folders')
      .select('id, user_id')
      .eq('id', folderId)
      .maybeSingle();
    if (!folder || folder.user_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    let annotation: string | null = null;
    try {
      const body = await request.json() as { annotation?: string };
      annotation = body?.annotation?.trim() || null;
    } catch {
      // 请求体为空（卡册/卡夹场景，收藏动作不带批语）——沿用原有的"点了即收藏"行为
    }

    // 首次入夹判定：修正为"这张卡片是不是第一次进这一个具体的夹子"，不是
    // "是不是第一次进我名下任意一个夹子"——之前的判断范围是后者，导致同一张
    // 卡片收藏进第一个夹子会通知，之后再收藏进第二个、第三个夹子都不会再
    // 触发通知（因为"曾经收藏过一次"这个全局判断一旦成立就再也不会是"第一次"
    // 了）。每收藏进一个新的、之前没收藏过的具体夹子，都应该算一次独立的
    // 收藏事件，都要通知。
    const { count: existingCount } = await admin
      .from('mind_card_folder_items')
      .select('folder_id', { count: 'exact', head: true })
      .eq('card_id', cardId)
      .eq('folder_id', folderId);

    const isFirstFavorite = (existingCount ?? 0) === 0;

    const { error } = await admin
      .from('mind_card_folder_items')
      .insert({ folder_id: folderId, card_id: cardId, annotation });

    if (error) {
      // 已在该夹里（组合主键冲突）视为成功
      if (error.code === '23505') return NextResponse.json({ ok: true });
      console.error('[mind-cards folders POST] error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    if (isFirstFavorite && card.user_id !== user.id) {
      const { error: notifError } = await admin.from('mind_card_notifications').insert({
        recipient_id: card.user_id,
        actor_id: user.id,
        card_id: cardId,
        type: 'favorite',
        folder_id: folderId,
      });
      if (notifError) {
        // 通知写入失败不影响收藏本身已经成功
        console.error('[mind-cards folders POST] notification error:', notifError);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[mind-cards folders POST] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/mind-cards/:id/folders/:folderId — 只更新批语，不影响收藏关系本身。
// 收藏这个动作和"要不要写/改批语"彻底解耦——点击收藏立刻生效（走POST，不带
// annotation），批语框弹出后用户自己按保存，走这个PATCH单独更新，就算不点
// 保存也不影响卡片已经收藏成功这件事。
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; folderId: string }> }
) {
  try {
    const { id: cardId, folderId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: folder } = await admin
      .from('mind_card_folders')
      .select('id, user_id')
      .eq('id', folderId)
      .maybeSingle();
    if (!folder || folder.user_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await request.json() as { annotation?: string };
    const annotation = body?.annotation?.trim() || null;

    const { error } = await admin
      .from('mind_card_folder_items')
      .update({ annotation })
      .eq('folder_id', folderId)
      .eq('card_id', cardId);

    if (error) {
      console.error('[mind-cards folders PATCH] error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[mind-cards folders PATCH] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/mind-cards/:id/folders/:folderId — 从指定夹移除
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; folderId: string }> }
) {
  try {
    const { id: cardId, folderId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: folder } = await admin
      .from('mind_card_folders')
      .select('id, user_id')
      .eq('id', folderId)
      .maybeSingle();
    if (!folder || folder.user_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { error } = await admin
      .from('mind_card_folder_items')
      .delete()
      .eq('folder_id', folderId)
      .eq('card_id', cardId);

    if (error) {
      console.error('[mind-cards folders DELETE] error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[mind-cards folders DELETE] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}