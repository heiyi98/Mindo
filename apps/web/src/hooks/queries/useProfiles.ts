'use client';
import { useQuery } from '@tanstack/react-query';

export interface Profile {
  id: string;
  display_name: string;
  birth_date: string;
  birth_time: string | null;
  birth_place_name: string | null;
  birth_lat: number | null;
  birth_lng: number | null;
  birth_timezone: string | null;
  gender: 'M' | 'F' | null;
  is_self: boolean;
  order_index?: number;
  is_minute_unknown?: boolean;
}

export function profilesQueryKey() {
  return ['profiles'] as const;
}

export async function fetchProfiles(): Promise<Profile[]> {
  const res = await fetch('/api/profiles');
  if (!res.ok) throw new Error('Failed to fetch profiles');
  const data = await res.json();
  return data.profiles ?? [];
}

/** 全局共用的档案列表缓存——Dock/ProfileSwitcher（经CurrentProfileContext）
    和档案管理页面读的是同一份数据，只真正发一次请求，任何一处增删改后
    invalidate这个key，另一处会自动跟着刷新。 */
export function useProfiles() {
  return useQuery({
    queryKey: profilesQueryKey(),
    queryFn: fetchProfiles,
  });
}
