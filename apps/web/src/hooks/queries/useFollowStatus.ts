'use client';
import { useQuery } from '@tanstack/react-query';

export interface FollowStatus {
  isSelf: boolean;
  iFollow: boolean;
  theyFollow: boolean;
}

export function followStatusQueryKey(targetId: string) {
  return ['follow-status', targetId] as const;
}

async function fetchFollowStatus(targetId: string): Promise<FollowStatus> {
  const res = await fetch(`/api/follows/status?targetId=${targetId}`);
  if (!res.ok) throw new Error('Failed to fetch follow status');
  return res.json();
}

/** 是否关注某个用户——片语个人页和u/[handle]主页共用同一份缓存。 */
export function useFollowStatus(targetId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: followStatusQueryKey(targetId ?? ''),
    queryFn: () => fetchFollowStatus(targetId as string),
    enabled: !!targetId && enabled,
  });
}
