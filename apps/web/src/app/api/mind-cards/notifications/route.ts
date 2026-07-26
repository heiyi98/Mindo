import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { mindCardsAdminClient as admin } from '@/lib/mindCards/adminClient';
import { isCardVisible, fetchRelationFlags, type RelationFlags } from '@/lib/mindCards/visibility';
import type { MindCardStyleV2 } from '@/lib/mindCards/style';

const EMPTY_RELATION: RelationFlags = { viewerFollowsAuthor: false, authorFollowsViewer: false };
const PAGE_SIZE = 50;

interface ActorInfo {
  id: string;
  handle: string;
  display_name: string | null;
}

async function fetchActorMap(actorIds: string[]): Promise<Map<string, ActorInfo>> {
  const uniqueIds = [...new Set(actorIds)];
  const map = new Map<string, ActorInfo>();
  if (uniqueIds.length === 0) return map;
  const { data } = await admin.from('users').select('id, handle, display_name').in('id', uniqueIds);
  for (const row of data ?? []) map.set(row.id, row);
  return map;
}

// GET /api/mind-cards/notifications — 提醒列表（最近50条，倒序）+ 未读数
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: rows, error } = await admin
      .from('mind_card_notifications')
      .select('id, type, created_at, read_at, actor_id, card_id, comment_id, target_comment_id, folder_id')
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);

    if (error) {
      console.error('[mind-cards/notifications GET] error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    // 未读数不受上面50条上限约束，单独查一次精确计数
    const { count: unreadCount } = await admin
      .from('mind_card_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .is('read_at', null);

    const notifRows = rows ?? [];

    const actorMap = await fetchActorMap(notifRows.map((r) => r.actor_id));

    // comment/reply类型：附带那条留言（这次动作本身产生的新留言）的内容做预览
    const commentIds = [...new Set(
      notifRows.filter((r) => r.type === 'comment' || r.type === 'reply').map((r) => r.comment_id).filter((id): id is string => !!id)
    )];
    const commentContentMap = new Map<string, string>();
    if (commentIds.length > 0) {
      const { data: comments } = await admin.from('mind_card_comments').select('id, content').in('id', commentIds);
      for (const c of comments ?? []) commentContentMap.set(c.id, c.content);
    }

    // reply类型：target_comment_id可能是一级留言本身（直接回复一级留言、没
    // @任何人），也可能是二级留言（@回复了某条具体的二级留言）——不管哪种，
    // 前端点开后都需要知道"该展开哪条一级留言的回复列表"，这里统一解析成
    // 那条一级留言的id（target本身就是一级留言时=它自己；是二级留言时=它的
    // parent_comment_id）。
    const replyTargetIds = [...new Set(
      notifRows.filter((r) => r.type === 'reply' && r.target_comment_id).map((r) => r.target_comment_id as string)
    )];
    const replyExpandParentMap = new Map<string, string>();
    if (replyTargetIds.length > 0) {
      const { data: targets } = await admin.from('mind_card_comments').select('id, parent_comment_id').in('id', replyTargetIds);
      for (const t of targets ?? []) replyExpandParentMap.set(t.id, t.parent_comment_id ?? t.id);
    }

    // favorite类型：附带卡片本身的style（缩略图用）
    const favoriteCardIds = [...new Set(notifRows.filter((r) => r.type === 'favorite').map((r) => r.card_id))];
    const cardStyleMap = new Map<string, MindCardStyleV2 | null>();
    if (favoriteCardIds.length > 0) {
      const { data: cards } = await admin.from('mind_cards').select('id, style').in('id', favoriteCardIds);
      for (const c of cards ?? []) cardStyleMap.set(c.id, c.style as MindCardStyleV2 | null);
    }

    // favorite类型：卡片集名字——只有这个卡片集对"收到通知的这个人"（即当前用户）
    // 可见才附带名字，不可见（比如收藏者把卡片收进了自己的私密卡片集）就不暴露
    // 名字，也不提供跳转。判断逻辑跟其他任何"能不能看某个卡片集"场景完全一样，
    // 复用 isCardVisible/fetchRelationFlags，不重新发明一套判断。
    const folderIds = [...new Set(
      notifRows.filter((r) => r.type === 'favorite' && r.folder_id).map((r) => r.folder_id as string)
    )];
    const folderNameMap = new Map<string, { id: string; name: string; is_default: boolean }>();
    if (folderIds.length > 0) {
      const { data: folders } = await admin
        .from('mind_card_folders')
        .select('id, user_id, name, visibility, is_default')
        .in('id', folderIds);
      const ownerIds = [...new Set((folders ?? []).map((f) => f.user_id))];
      const relations = await fetchRelationFlags(admin, user.id, ownerIds);
      for (const f of folders ?? []) {
        const visible = isCardVisible(f.user_id, f.visibility, user.id, relations.get(f.user_id) ?? EMPTY_RELATION);
        if (visible) folderNameMap.set(f.id, { id: f.id, name: f.name, is_default: f.is_default });
      }
    }

    const notifications = notifRows.map((r) => ({
      id: r.id,
      type: r.type,
      created_at: r.created_at,
      read_at: r.read_at,
      actor: actorMap.get(r.actor_id) ?? { id: r.actor_id, handle: '', display_name: null },
      card_id: r.card_id,
      comment_id: r.comment_id,
      target_comment_id: r.target_comment_id,
      expand_parent_id: r.type === 'reply' && r.target_comment_id ? replyExpandParentMap.get(r.target_comment_id) ?? null : null,
      preview: r.comment_id ? commentContentMap.get(r.comment_id) ?? null : null,
      card_style: r.type === 'favorite' ? cardStyleMap.get(r.card_id) ?? null : null,
      folder: r.type === 'favorite' && r.folder_id ? folderNameMap.get(r.folder_id) ?? null : null,
    }));

    return NextResponse.json({ notifications, unreadCount: unreadCount ?? 0 });
  } catch (error) {
    console.error('[mind-cards/notifications GET] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
