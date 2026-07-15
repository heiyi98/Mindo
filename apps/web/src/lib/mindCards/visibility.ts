import type { SupabaseClient } from '@supabase/supabase-js';

export type CardVisibility = 'private' | 'followers' | 'friends' | 'public';

export interface RelationFlags {
  /** viewer 是 author 的粉丝（viewer 关注了 author） */
  viewerFollowsAuthor: boolean;
  /** author 是 viewer 的粉丝（author 关注了 viewer） */
  authorFollowsViewer: boolean;
}

const EMPTY_RELATION: RelationFlags = { viewerFollowsAuthor: false, authorFollowsViewer: false };

/**
 * 隐私档位可见性判定。RLS本次不做，这是本模块唯一的权限真相来源。
 * 未知的 visibility 值一律 fail-closed（视为不可见），不放行。
 */
export function isCardVisible(
  authorId: string,
  visibility: string,
  viewerId: string,
  relation: RelationFlags,
): boolean {
  if (authorId === viewerId) return true;
  switch (visibility as CardVisibility) {
    case 'public':
      return true;
    case 'followers':
      return relation.viewerFollowsAuthor;
    case 'friends':
      return relation.viewerFollowsAuthor && relation.authorFollowsViewer;
    case 'private':
      return false;
    default:
      return false;
  }
}

/**
 * 批量拉取 viewer 与一批 authorIds 之间的关注关系，一次两条查询，避免逐卡片查询的 N+1。
 */
export async function fetchRelationFlags(
  admin: SupabaseClient,
  viewerId: string,
  authorIds: string[],
): Promise<Map<string, RelationFlags>> {
  const uniqueAuthorIds = [...new Set(authorIds)];
  const relations = new Map<string, RelationFlags>();
  for (const id of uniqueAuthorIds) relations.set(id, { ...EMPTY_RELATION });
  if (uniqueAuthorIds.length === 0) return relations;

  const [{ data: viewerFollows }, { data: followsViewer }] = await Promise.all([
    admin
      .from('follows')
      .select('following_id')
      .eq('follower_id', viewerId)
      .in('following_id', uniqueAuthorIds),
    admin
      .from('follows')
      .select('follower_id')
      .eq('following_id', viewerId)
      .in('follower_id', uniqueAuthorIds),
  ]);

  for (const row of viewerFollows ?? []) {
    const flags = relations.get(row.following_id);
    if (flags) flags.viewerFollowsAuthor = true;
  }
  for (const row of followsViewer ?? []) {
    const flags = relations.get(row.follower_id);
    if (flags) flags.authorFollowsViewer = true;
  }

  return relations;
}

/**
 * 批量过滤卡片列表：拉一次关系数据，逐张卡片判定可见性。
 * 两个 tab（关注/推荐）和三个互动接口（点赞/收藏/已读，单卡片场景传入长度为1的数组）统一调这一个函数。
 */
export async function filterVisibleCards<T extends { user_id: string; visibility: string }>(
  admin: SupabaseClient,
  viewerId: string,
  cards: T[],
): Promise<T[]> {
  if (cards.length === 0) return [];
  const authorIds = cards.map((c) => c.user_id);
  const relations = await fetchRelationFlags(admin, viewerId, authorIds);
  return cards.filter((card) =>
    isCardVisible(card.user_id, card.visibility, viewerId, relations.get(card.user_id) ?? EMPTY_RELATION)
  );
}

/**
 * 单卡片场景（点赞/收藏/标记已读前置检查）：先查卡片本体，再判定可见性。
 * 未通过统一返回 null，调用方据此回404，不暴露"存在但无权限"与"不存在"的区别。
 */
export async function fetchVisibleCard(
  admin: SupabaseClient,
  viewerId: string,
  cardId: string,
): Promise<{ id: string; user_id: string; visibility: string } | null> {
  const { data: card } = await admin
    .from('mind_cards')
    .select('id, user_id, visibility')
    .eq('id', cardId)
    .maybeSingle();

  if (!card) return null;

  const relations = await fetchRelationFlags(admin, viewerId, [card.user_id]);
  const visible = isCardVisible(
    card.user_id,
    card.visibility,
    viewerId,
    relations.get(card.user_id) ?? EMPTY_RELATION
  );
  return visible ? card : null;
}

export interface MindCardFolder {
  id: string;
  user_id: string;
  visibility: string;
  is_default: boolean;
}

/**
 * 卡片夹场景的等价函数：isCardVisible 本身只依赖"owner/visibility/viewer/relation"，
 * 卡片和卡片夹共用同一套四档语义，不需要另写一份判定逻辑。
 */
export async function fetchVisibleFolder(
  admin: SupabaseClient,
  viewerId: string,
  folderId: string,
): Promise<MindCardFolder | null> {
  const { data: folder } = await admin
    .from('mind_card_folders')
    .select('id, user_id, visibility, is_default')
    .eq('id', folderId)
    .maybeSingle();

  if (!folder) return null;

  const relations = await fetchRelationFlags(admin, viewerId, [folder.user_id]);
  const visible = isCardVisible(
    folder.user_id,
    folder.visibility,
    viewerId,
    relations.get(folder.user_id) ?? EMPTY_RELATION
  );
  return visible ? folder : null;
}
