import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { mindCardsAdminClient as admin } from '@/lib/mindCards/adminClient';
import { fetchVisibleCard } from '@/lib/mindCards/visibility';

// POST /api/mind-cards/:id/folders/:folderId — 把卡片加入指定夹（只能加进自己的夹）。
// annotation：可选，只有目标夹是'本'（folder_kind='notebook'）时前端才会传，
// 后端不强制校验folder_kind一致性——传了就存，卡册/卡夹传annotation本身无害
// （前端UI本来就不会给这两种夹弹批语输入框，不会误传）。
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

    // 首次入夹判定：插入前，该用户名下所有夹里，这张卡片的关联行数是否为0
    const { data: ownFolders } = await admin
      .from('mind_card_folders')
      .select('id')
      .eq('user_id', user.id);
    const ownFolderIds = (ownFolders ?? []).map((f) => f.id);

    const { count: existingCount } = await admin
      .from('mind_card_folder_items')
      .select('folder_id', { count: 'exact', head: true })
      .eq('card_id', cardId)
      .in('folder_id', ownFolderIds);

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
      // 统一走 mind_card_notifications（跟留言/回复通知共用一张表，供通知中心
      // 一个列表统一读取）。旧的 mind_card_favorite_notifications 表停止写入
      // ——这次之前那张表没有配套的通知中心UI，现在有了真正的通知中心，
      // 直接切过来，不再维护两套并行的收藏通知记录。
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