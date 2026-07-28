import type { SupabaseClient } from '@supabase/supabase-js';

export interface AuthorInfo {
  id: string;
  handle: string;
  display_name: string | null;
}

/**
 * 批量查一批用户id对应的handle/display_name——卡片列表类接口统一复用这个
 * 函数，不要各自重复实现一遍（之前留言、通知接口各自写过一份几乎一样的
 * 逻辑，这次收拢成一个共享函数）。
 */
export async function fetchAuthorMap(admin: SupabaseClient, userIds: string[]): Promise<Map<string, AuthorInfo>> {
  const uniqueIds = [...new Set(userIds)];
  const map = new Map<string, AuthorInfo>();
  if (uniqueIds.length === 0) return map;
  const { data } = await admin.from('users').select('id, handle, display_name').in('id', uniqueIds);
  for (const row of data ?? []) map.set(row.id, row);
  return map;
}
