'use client';
import { useQuery } from '@tanstack/react-query';

export function dashboardQueryKey(profileId: string | null | undefined) {
  return ['dashboard', profileId] as const;
}

async function fetchDashboardData(profileId: string) {
  const res = await fetch(`/api/dashboard?profile_id=${profileId}`);
  if (!res.ok) throw new Error('Failed to fetch dashboard data');
  return res.json();
}

/** 同一个 profileId 的 /api/dashboard 结果在多个卡片组件间共享同一份缓存，
    只真正发起一次请求。 */
export function useDashboardData(profileId: string | null | undefined) {
  return useQuery({
    queryKey: dashboardQueryKey(profileId),
    queryFn: () => fetchDashboardData(profileId as string),
    enabled: !!profileId,
  });
}
