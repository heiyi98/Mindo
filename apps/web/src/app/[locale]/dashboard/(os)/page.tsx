'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import type { Wuxing } from '@mindo/core';
import BaziChart from '@/components/dashboard/BaziChart';
import EnergyRadar from '@/components/onboarding/teaser/EnergyRadar';
import DailyFortunePlaceholder from '@/components/dashboard/DailyFortunePlaceholder';
import ProfileSwitcher from '@/components/dashboard/ProfileSwitcher';
import { useTopBar } from '@/components/os/TopBarContext';
import { useCurrentProfile } from '@/components/os/CurrentProfileContext';

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const { setContent } = useTopBar();
  const { currentProfile } = useCurrentProfile();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!currentProfile) return;
    setLoading(true);
    setData(null);
    fetch(`/api/dashboard?profile_id=${currentProfile.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) setError(data.error);
        else setData(data);
      })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false));
  }, [currentProfile?.id]);

  useEffect(() => {
    setContent({ left: <ProfileSwitcher /> });
    return () => setContent({});
  }, [setContent]);

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

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p style={{ color: 'hsl(var(--muted-foreground))' }}>
          {t('loadError')}
        </p>
      </div>
    );
  }

  const { bazi, profile } = data;
  const energyScores = bazi.energyScores as Record<Wuxing, number>;
  const dayStem = bazi.dayStem as string;

  const STEM_TO_ELEMENT: Record<string, Wuxing> = {
    Jia: 'Wood', Yi: 'Wood', Bing: 'Fire', Ding: 'Fire',
    Wu: 'Earth', Ji: 'Earth', Geng: 'Metal', Xin: 'Metal',
    Ren: 'Water', Gui: 'Water',
  };
  const element = STEM_TO_ELEMENT[dayStem] || 'Water';

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <p
          className="text-xs tracking-[0.3em] uppercase"
          style={{ color: 'hsl(var(--muted-foreground) / 0.5)' }}
        >
          {profile.display_name}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="md:col-span-2 p-6 rounded-3xl"
          style={{
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
          }}
        >
          <BaziChart pillars={bazi.pillars} dayStem={dayStem} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 rounded-3xl"
          style={{
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
          }}
        >
          <DailyFortunePlaceholder />
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="p-6 rounded-3xl"
        style={{
          background: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
        }}
      >
        <h3
          className="text-xs font-light tracking-[0.3em] uppercase mb-6"
          style={{ color: 'hsl(var(--muted-foreground) / 0.6)' }}
        >
          {t('energy.title')}
        </h3>
        <div className="w-full max-w-sm mx-auto" style={{ height: 300 }}>
          <EnergyRadar
            energyData={energyScores}
            dayMasterElement={element}
          />
        </div>
      </motion.div>
    </div>
  );
}
