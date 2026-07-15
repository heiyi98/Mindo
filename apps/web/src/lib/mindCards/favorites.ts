import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * "收藏"点亮态 = 该卡片在 viewer 名下任意卡片夹（含默认收藏夹）里存在关联记录，
 * 不是独立布尔字段，是派生查询结果。following/recommend/folders-cards/profile-mine
 * 等所有需要展示"是否已收藏"标记的入口，统一调这一个函数，不各自重复拼查询。
 */
export async function computeFavoritedSet(
  admin: SupabaseClient,
  userId: string,
  cardIds: string[],
): Promise<Set<string>> {
  if (cardIds.length === 0) return new Set();

  const { data: ownFolders } = await admin
    .from('mind_card_folders')
    .select('id')
    .eq('user_id', userId);
  const folderIds = (ownFolders ?? []).map((f) => f.id);
  if (folderIds.length === 0) return new Set();

  const { data: items } = await admin
    .from('mind_card_folder_items')
    .select('card_id')
    .in('folder_id', folderIds)
    .in('card_id', cardIds);

  return new Set((items ?? []).map((i) => i.card_id));
}
