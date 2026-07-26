import type { SupabaseClient } from '@supabase/supabase-js';

export interface BehaviorCandidateAuthor {
  authorId: string;
  // "共现次数"：跟当前用户收藏过同一批内容的其他人，还收藏了多少张这个作者
  // 发布的、当前用户尚未收藏过的卡片——数字越大，说明这个作者的内容被"跟我
  // 品味相近的人"验证过越多次，排序依据用这个数字，不是别的加工分数。
  coOccurrenceCount: number;
}

/**
 * "行为共现"统计——现查现算，本身不积累任何状态（存储的原始行为数据是
 * mind_card_folder_items/follows这些表本身，不是这个函数的产物）。
 * 逻辑（见 Mindo-片语.md 第三十四节）：
 * 1. 当前用户收藏过哪些卡片
 * 2. 这些卡片还被哪些"其他人"收藏过（这些人就是"跟我品味相近的人"）
 * 3. 这些其他人还收藏了哪些别的卡片（排除当前用户已经收藏过的）
 * 4. 这些卡片的作者，出现次数即为共现次数，作为排序依据
 * 候选不够时由调用方自行用随机补足，这个函数只负责如实计算，找不到候选就
 * 返回空数组，不报错。
 */
export async function computeBehaviorCandidateAuthors(
  admin: SupabaseClient,
  userId: string,
): Promise<BehaviorCandidateAuthor[]> {
  const { data: ownFolders } = await admin
    .from('mind_card_folders')
    .select('id')
    .eq('user_id', userId);
  const ownFolderIds = (ownFolders ?? []).map((f) => f.id);
  if (ownFolderIds.length === 0) return [];

  const { data: ownItems } = await admin
    .from('mind_card_folder_items')
    .select('card_id')
    .in('folder_id', ownFolderIds);
  const favoritedCardIds = [...new Set((ownItems ?? []).map((i) => i.card_id))];
  if (favoritedCardIds.length === 0) return [];

  // 反查这些卡片还被哪些夹收藏过（先拿folder_id，再反查这些夹各自的owner，
  // 不用embed语法，避免PostgREST关系路径歧义）
  const { data: otherItemRows } = await admin
    .from('mind_card_folder_items')
    .select('folder_id')
    .in('card_id', favoritedCardIds);
  const otherFolderIdsRaw = [...new Set((otherItemRows ?? []).map((r) => r.folder_id))]
    .filter((id) => !ownFolderIds.includes(id));
  if (otherFolderIdsRaw.length === 0) return [];

  const { data: otherFoldersOwners } = await admin
    .from('mind_card_folders')
    .select('id, user_id')
    .in('id', otherFolderIdsRaw);
  const otherUserIds = [...new Set((otherFoldersOwners ?? []).map((f) => f.user_id))]
    .filter((id) => id !== userId);
  if (otherUserIds.length === 0) return [];

  // 这些"其他用户"名下所有的夹（含刚才已经查过的那些，重新按owner查一遍更
  // 完整——同一个人可能有多个夹,不止刚才反查到的那个）
  const { data: otherUsersFolders } = await admin
    .from('mind_card_folders')
    .select('id')
    .in('user_id', otherUserIds);
  const otherUsersFolderIds = (otherUsersFolders ?? []).map((f) => f.id);
  if (otherUsersFolderIds.length === 0) return [];

  const { data: theirItems } = await admin
    .from('mind_card_folder_items')
    .select('card_id')
    .in('folder_id', otherUsersFolderIds);
  const favoritedSet = new Set(favoritedCardIds);
  const candidateCardIds = [...new Set((theirItems ?? []).map((i) => i.card_id))]
    .filter((id) => !favoritedSet.has(id));
  if (candidateCardIds.length === 0) return [];

  const { data: candidateCards } = await admin
    .from('mind_cards')
    .select('id, user_id')
    .in('id', candidateCardIds);

  const countByAuthor = new Map<string, number>();
  for (const c of candidateCards ?? []) {
    if (c.user_id === userId) continue;
    countByAuthor.set(c.user_id, (countByAuthor.get(c.user_id) ?? 0) + 1);
  }

  return [...countByAuthor.entries()]
    .map(([authorId, coOccurrenceCount]) => ({ authorId, coOccurrenceCount }))
    .sort((a, b) => b.coOccurrenceCount - a.coOccurrenceCount);
}
