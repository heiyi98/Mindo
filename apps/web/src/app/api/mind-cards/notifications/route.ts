import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth/requireAuth';
import { mindCardsAdminClient as admin, mindCardsRepository as repo } from '@/lib/mindCards/adminClient';
import { isCardVisible, fetchRelationFlags, type RelationFlags } from '@/lib/mindCards/visibility';
import { fetchAuthorMap } from '@/lib/mindCards/authors';
import type { MindCardStyleV2 } from '@/lib/mindCards/style';

const EMPTY_RELATION: RelationFlags = { viewerFollowsAuthor: false, authorFollowsViewer: false };
const PAGE_SIZE = 50;

// GET /api/mind-cards/notifications — 提醒列表（最近50条，倒序）+ 未读数
export async function GET() {
  try {
    const { user } = await requireApiUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const notifRows = await repo.listNotifications(user.id, PAGE_SIZE);

    // 未读数不受上面50条上限约束，单独查一次精确计数
    const unreadCount = await repo.countUnreadNotifications(user.id);

    const authorMap = await fetchAuthorMap(admin, notifRows.map((r) => r.actor_id));

    // comment/reply类型：附带那条留言（这次动作本身产生的新留言）的内容做预览
    const commentIds = [...new Set(
      notifRows.filter((r) => r.type === 'comment' || r.type === 'reply').map((r) => r.comment_id).filter((id): id is string => !!id)
    )];
    const commentContentMap = new Map<string, string>();
    if (commentIds.length > 0) {
      const commentsById = await repo.getCommentsByIds(commentIds);
      for (const [id, c] of commentsById) commentContentMap.set(id, c.content);
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
      const targetsById = await repo.getCommentsByIds(replyTargetIds);
      for (const [id, t] of targetsById) replyExpandParentMap.set(id, t.parent_comment_id ?? id);
    }

    // favorite类型：附带卡片本身的style（缩略图用）
    const favoriteCardIds = [...new Set(notifRows.filter((r) => r.type === 'favorite').map((r) => r.card_id))];
    const cardStyleMap = favoriteCardIds.length > 0
      ? await repo.getCardStylesByIds(favoriteCardIds) as Map<string, MindCardStyleV2 | null>
      : new Map<string, MindCardStyleV2 | null>();

    // favorite类型：卡片集名字——只有这个卡片集对"收到通知的这个人"（即当前用户）
    // 可见才附带名字，不可见（比如收藏者把卡片收进了自己的私密卡片集）就不暴露
    // 名字，也不提供跳转。判断逻辑跟其他任何"能不能看某个卡片集"场景完全一样，
    // 复用 isCardVisible/fetchRelationFlags，不重新发明一套判断。
    const folderIds = [...new Set(
      notifRows.filter((r) => r.type === 'favorite' && r.folder_id).map((r) => r.folder_id as string)
    )];
    const folderNameMap = new Map<string, { id: string; name: string; is_default: boolean }>();
    if (folderIds.length > 0) {
      const folders = await repo.getFoldersByIds(folderIds);
      const ownerIds = [...new Set(folders.map((f) => f.user_id))];
      const relations = await fetchRelationFlags(admin, user.id, ownerIds);
      for (const f of folders) {
        const visible = isCardVisible(f.user_id, f.visibility, user.id, relations.get(f.user_id) ?? EMPTY_RELATION);
        if (visible) folderNameMap.set(f.id, { id: f.id, name: f.name, is_default: f.is_default });
      }
    }

    const notifications = notifRows.map((r) => ({
      id: r.id,
      type: r.type,
      created_at: r.created_at,
      read_at: r.read_at,
      actor: authorMap.get(r.actor_id) ?? { id: r.actor_id, handle: '', display_name: null },
      card_id: r.card_id,
      comment_id: r.comment_id,
      target_comment_id: r.target_comment_id,
      expand_parent_id: r.type === 'reply' && r.target_comment_id ? replyExpandParentMap.get(r.target_comment_id) ?? null : null,
      preview: r.comment_id ? commentContentMap.get(r.comment_id) ?? null : null,
      card_style: r.type === 'favorite' ? cardStyleMap.get(r.card_id) ?? null : null,
      folder: r.type === 'favorite' && r.folder_id ? folderNameMap.get(r.folder_id) ?? null : null,
    }));

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error('[mind-cards/notifications GET] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
