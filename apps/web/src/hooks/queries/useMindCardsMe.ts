'use client';
import { useQuery } from '@tanstack/react-query';

export interface MindCardsMe {
  id: string;
  handle: string;
  display_name: string | null;
}

async function fetchMe(): Promise<MindCardsMe> {
  const res = await fetch('/api/mind-cards/me');
  if (!res.ok) throw new Error('Failed to fetch current mind-cards user');
  return res.json();
}

/** 当前登录用户自己的id/handle/display_name——乐观更新场景（发留言/关注等）
    需要立刻知道"这是谁"，不能等后端确认。多处组件共用同一份缓存。 */
export function useMindCardsMe() {
  return useQuery({
    queryKey: ['mind-cards-me'],
    queryFn: fetchMe,
    staleTime: 5 * 60 * 1000,
  });
}
