'use client';
import { useQuery } from '@tanstack/react-query';

export interface HandleUser {
  id: string;
  handle: string;
  display_name: string | null;
}

export function userByHandleQueryKey(handle: string) {
  return ['user-by-handle', handle] as const;
}

async function fetchUserByHandle(handle: string): Promise<{ user: HandleUser } | null> {
  const res = await fetch(`/api/users/${handle}`);
  return res.ok ? res.json() : null;
}

/** 按handle解析用户——片语个人页和u/[handle]主页共用同一份缓存。 */
export function useUserByHandle(handle: string) {
  return useQuery({
    queryKey: userByHandleQueryKey(handle),
    queryFn: () => fetchUserByHandle(handle),
  });
}
