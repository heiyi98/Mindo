'use client';
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { useCurrentProfile } from '@/components/os/CurrentProfileContext';
import { useTopBar } from '@/components/os/TopBarContext';
import ProfileSwitcher from '@/components/dashboard/ProfileSwitcher';
import StarChartWheel from '@/components/divination/western/StarChartWheel';
import PlanetList from '@/components/divination/western/PlanetList';
import HouseList from '@/components/divination/western/HouseList';
import type { StarChartResult, FullModeResult, DateModeResult } from '@mindo/core';

export default function WesternPage() {
  const t = useTranslations('western');
  const { currentProfile } = useCurrentProfile();
  const { setContent } = useTopBar();
  const [result, setResult] = useState<StarChartResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setContent({ left: <ProfileSwitcher /> });
    return () => setContent({});
  }, [setContent]);

  useEffect(() => {
    if (!currentProfile) return;
    setLoading(true);
    setError('');

    fetch('/api/astrology/western', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile_id: currentProfile.id }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) setError(data.error);
        else setResult(data.result);
      })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false));
  }, [currentProfile?.id]);

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
          <StarChartWheel result={fullResult} />
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
