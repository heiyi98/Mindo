'use client';
import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { useDashboardData } from '@/hooks/queries/useDashboardData';
import { useProfiles, type Profile } from '@/hooks/queries/useProfiles';

interface CurrentProfileContextType {
  currentProfile: Profile | null;
  profiles: Profile[];
  setCurrentProfile: (profile: Profile) => void;
  loading: boolean;
  refetch: () => void;
  /** 账户本人(is_self=true)的日主五行，不随 currentProfile 切换而变化。
      还没加载出来、或者本人档案还没建好八字之前是 null。 */
  selfWuxing: string | null;
}

const CurrentProfileContext = createContext<CurrentProfileContextType | null>(null);

export function CurrentProfileProvider({ children }: { children: ReactNode }) {
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);

  // 跟档案管理页面（profile/profiles/page.tsx）共用同一份/api/profiles缓存，
  // 只真正发一次请求；那边增删改后invalidate这个key，这里（Dock/ProfileSwitcher）
  // 会自动跟着刷新。
  const { data: profiles = [], isLoading, refetch } = useProfiles();

  // 优先用户手动选过的档案；否则默认本人档案，再退回列表第一个。
  // 从 profiles 列表里现查而不是存一份快照，档案信息更新后（比如改名）
  // 这里会自动跟着刷新，不会出现"看起来像没保存"的情况。
  const currentProfile = useMemo(() => {
    if (currentProfileId) {
      const found = profiles.find(p => p.id === currentProfileId);
      if (found) return found;
    }
    return profiles.find(p => p.is_self) ?? profiles[0] ?? null;
  }, [profiles, currentProfileId]);

  const selfProfile = useMemo(() => profiles.find(p => p.is_self) ?? null, [profiles]);

  // 本人日主五行：只看 profiles 列表里 is_self 是谁，不看 currentProfile，
  // 所以切换查看别人的档案时这个值不会跟着变。查询共享同一份
  // /api/dashboard 缓存（queryKey 里带 profileId），跟其他卡片组件命中同一份数据。
  const { data: selfDashboard } = useDashboardData(selfProfile?.id);
  const selfWuxing = useMemo(() => {
    const dayStemNode = selfDashboard?.bazi?.pillars?.tianGanNodes?.find(
      (n: any) => n.pos === 'DayStem'
    );
    return dayStemNode?.wuxing ?? null;
  }, [selfDashboard]);

  const setCurrentProfile = useCallback((profile: Profile) => {
    setCurrentProfileId(profile.id);
  }, []);

  return (
    <CurrentProfileContext.Provider value={{
      currentProfile,
      profiles,
      setCurrentProfile,
      loading: isLoading,
      refetch,
      selfWuxing,
    }}>
      {children}
    </CurrentProfileContext.Provider>
  );
}

export function useCurrentProfile() {
  const ctx = useContext(CurrentProfileContext);
  if (!ctx) throw new Error('useCurrentProfile must be used within CurrentProfileProvider');
  return ctx;
}
