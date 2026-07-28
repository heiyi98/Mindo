'use client';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useCurrentProfile } from '@/components/os/CurrentProfileContext';
import { useTopBar } from '@/components/os/TopBarContext';
import ProfileSwitcher from '@/components/dashboard/ProfileSwitcher';
import StarChartWheel from '@/components/modules/western/StarChartWheel';
import PlanetList from '@/components/modules/western/PlanetList';
import HouseList from '@/components/modules/western/HouseList';
import type { StarChartResult, FullModeResult, DateModeResult } from '@mindo/core';

export default function WesternPage() {
  const t = useTranslations('western');
  const { currentProfile } = useCurrentProfile();
  const { setContent } = useTopBar();

  useEffect(() => {
    setContent({ left: <ProfileSwitcher /> });
    return () => setContent({});
  }, [setContent]);

  // 跟StarChartWheel（下面渲染的星盘圆图）共用同一份/api/astrology/western
  // 缓存，只真正发一次请求。
  const { data, isLoading: loading, error: queryError } = useQuery({
    queryKey: ['western-chart', currentProfile?.id],
    queryFn: async () => {
      const res = await fetch('/api/astrology/western', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_id: currentProfile!.id }),
      });
      if (!res.ok) throw new Error('Failed to fetch western chart');
      return res.json();
    },
    enabled: !!currentProfile,
  });
  const result: StarChartResult | null = data?.result ?? null;
  const error = data?.error || (queryError ? 'Failed to load' : '');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'hsl(var(--foreground) / 0.3)' }}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm" style={{ color: 'hsl(var(--destructive))' }}>{error}</p>
      </div>
    );
  }

  if (!result) return null;

  const isFullMode = result.mode === 'full';
  const fullResult = isFullMode ? (result as FullModeResult) : null;
  const dateResult = !isFullMode ? (result as DateModeResult) : null;

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <h1
          className="text-xs font-light tracking-[0.3em] uppercase"
          style={{ color: 'hsl(var(--muted-foreground) / 0.5)' }}
        >
          {t('title')}
        </h1>
        <span className="text-xs" style={{ color: 'hsl(var(--muted-foreground) / 0.4)' }}>
          {isFullMode ? t('fullMode') : t('dateMode')}
        </span>
      </motion.div>

      {/* 日期模式提示 */}
      {!isFullMode && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="px-4 py-3 rounded-2xl text-sm font-light"
          style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }}
        >
          {t('dateModeNote')}
        </motion.div>
      )}

      {/* 月亮警告 */}
      {dateResult?.moonWarning && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="px-4 py-3 rounded-2xl text-sm font-light"
          style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }}
        >
          {t('moonWarning', {
            sign1: t(`signs.${dateResult.moonWarning.moonSignAtMidnight}`),
            sign2: t(`signs.${dateResult.moonWarning.moonSignAtEndOfDay}`),
          })}
        </motion.div>
      )}

      {/* 星盘圆图（仅时分模式） */}
      {fullResult && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="p-4 rounded-3xl"
          style={{
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
          }}
        >
          <StarChartWheel profileId={currentProfile?.id ?? ''} />
        </motion.div>
      )}

      {/* 行星列表 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <PlanetList planets={result.planets} />
      </motion.div>

      {/* 宫位列表（仅时分模式） */}
      {fullResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <HouseList houses={fullResult.houses} angles={fullResult.angles} />
        </motion.div>
      )}
    </div>
  );
}
