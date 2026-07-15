import type { SupabaseClient } from '@supabase/supabase-js';
import type { MindCardStyleV2 } from './style';

export interface FolderCoverCard {
  id: string;
  content: string;
  style: MindCardStyleV2 | null;
}

/**
 * 卡片集展示框的封面 = 该夹里最新一张（added_at最大）卡片的内容，不做N+1查询：
 * 一次查全部夹的folder_items按added_at倒序，JS里按folder_id去重取第一条（即最新），
 * 再一次性拉这些card_id对应的卡片内容。
 */
export async function fetchLatestCardByFolder(
  admin: SupabaseClient,
  folderIds: string[],
): Promise<Map<string, FolderCoverCard>> {
  const result = new Map<string, FolderCoverCard>();
  if (folderIds.length === 0) return result;

  const { data: items } = await admin
    .from('mind_card_folder_items')
    .select('folder_id, card_id, added_at')
    .in('folder_id', folderIds)
    .order('added_at', { ascending: false });

  const latestCardIdByFolder = new Map<string, string>();
  for (const row of items ?? []) {
    if (!latestCardIdByFolder.has(row.folder_id)) {
      latestCardIdByFolder.set(row.folder_id, row.card_id);
    }
  }
  if (latestCardIdByFolder.size === 0) return result;

  const cardIds = [...new Set(latestCardIdByFolder.values())];
  const { data: cards } = await admin
    .from('mind_cards')
    .select('id, content, style')
    .in('id', cardIds);
  const cardsById = new Map((cards ?? []).map((c) => [c.id, c as FolderCoverCard]));

  for (const [folderId, cardId] of latestCardIdByFolder) {
    const card = cardsById.get(cardId);
    if (card) result.set(folderId, card);
  }
  return result;
}
