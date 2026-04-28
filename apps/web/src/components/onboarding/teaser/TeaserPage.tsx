'use client';
import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import type { Wuxing } from '@mindo/core';
import ParticleBackground from './ParticleBackground';
import DayMasterCard from './DayMasterCard';
import EnergyRadar from './EnergyRadar';
import CelebrityCarousel from './CelebrityCarousel';
import Divider from './Divider';

const STEM_TO_ELEMENT: Record<string, Wuxing> = {
  Jia: 'Wood', Yi: 'Wood',
  Bing: 'Fire', Ding: 'Fire',
  Wu: 'Earth', Ji: 'Earth',
  Geng: 'Metal', Xin: 'Metal',
  Ren: 'Water', Gui: 'Water',
};

const ELEMENT_THEMES: Record<Wuxing, {
  accent: string;
  accentBg: string;
  particle: string;
  glow: string;
}> = {
  Wood:  { accent: '#10b981', accentBg: 'rgba(16,185,129,0.1)',  particle: 'rgba(16,185,129,0.7)',  glow: '0 0 80px rgba(16,185,129,0.12)' },
  Fire:  { accent: '#f43f5e', accentBg: 'rgba(244,63,94,0.1)',   particle: 'rgba(244,63,94,0.7)',   glow: '0 0 80px rgba(244,63,94,0.12)' },
  Earth: { accent: '#f59e0b', accentBg: 'rgba(245,158,11,0.1)',  particle: 'rgba(245,158,11,0.7)',  glow: '0 0 80px rgba(245,158,11,0.12)' },
  Metal: { accent: '#94a3b8', accentBg: 'rgba(148,163,184,0.1)', particle: 'rgba(148,163,184,0.7)', glow: '0 0 80px rgba(148,163,184,0.12)' },
  Water: { accent: '#3b82f6', accentBg: 'rgba(59,130,246,0.1)',  particle: 'rgba(59,130,246,0.7)',  glow: '0 0 80px rgba(59,130,246,0.12)' },
};

interface TeaserPageProps {
  baziData: {
    dayStem: string;
    energyScores: Record<Wuxing, number>;
  };
  onLogin: () => void;
}

export default function TeaserPage({ baziData, onLogin }: TeaserPageProps) {
  const t = useTranslations('onboarding.teaser');
  const locale = useLocale();
  const [stemContent, setStemContent] = useState<Record<string, unknown> | null>(null);
  const [celebrities, setCelebrities] = useState<{ id: string; name: string; portrait_url: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  const { dayStem, energyScores } = baziData;
  const element = STEM_TO_ELEMENT[dayStem] || 'Wood';
  const theme = ELEMENT_THEMES[element];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [contentRes, celebRes] = await Promise.all([
          fetch(`/api/stem-content?stem_id=${dayStem}&locale=${locale}&content_type=personality_intro`),
          fetch(`/api/celebrities?stem_id=${dayStem}`),
        ]);
        const contentData = await contentRes.json();
        const celebData = await celebRes.json();
        setStemContent(contentData.content);
        setCelebrities(celebData.celebrities || []);
      } catch (err) {
        console.error('TeaserPage fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [dayStem, locale]);

  const name = (stemContent?.name as string) || dayStem;
  const imagery = (stemContent?.imagery as string) || '';
  const intro = (stemContent?.intro as string) || '';
  const tags = Array.isArray(stemContent?.tags) ? (stemContent.tags as string[]) : [];

  const elementNames: Record<Wuxing, { en: string; zh: string }> = {
    Wood:  { en: dayStem === 'Jia' ? 'Yang Wood' : 'Yin Wood',    zh: dayStem === 'Jia' ? '甲木' : '乙木' },
    Fire:  { en: dayStem === 'Bing' ? 'Yang Fire' : 'Yin Fire',   zh: dayStem === 'Bing' ? '丙火' : '丁火' },
    Earth: { en: dayStem === 'Wu' ? 'Yang Earth' : 'Yin Earth',   zh: dayStem === 'Wu' ? '戊土' : '己土' },
    Metal: { en: dayStem === 'Geng' ? 'Yang Metal' : 'Yin Metal', zh: dayStem === 'Geng' ? '庚金' : '辛金' },
    Water: { en: dayStem === 'Ren' ? 'Yang Water' : 'Yin Water',  zh: dayStem === 'Ren' ? '壬水' : '癸水' },
  };
  const coreTitle = locale === 'zh'
    ? elementNames[element].zh
    : elementNames[element].en;

  return (
    <div
      className="relative min-h-screen w-full flex flex-col items-center pb-24 overflow-hidden"
      style={{ background: 'hsl(var(--background))' }}
    >
      <ParticleBackground color={theme.particle} />

      <div
        className="relative z-10 w-full max-w-2xl mx-auto px-4 pt-12 flex flex-col items-center"
        style={{ boxShadow: theme.glow }}
      >
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div
              className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: theme.accent }}
            />
          </div>
        ) : (
          <>
            <DayMasterCard
              stemId={dayStem}
              name={name}
              imagery={imagery}
              intro={intro}
              tags={tags}
              accentColor={theme.accent}
              accentBg={theme.accentBg}
            />

            <Divider delay={0.5} />

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="w-full max-w-[320px] mx-auto"
              style={{ height: 320 }}
            >
              <EnergyRadar
                energyData={energyScores}
                dayMasterElement={element}
              />
            </motion.div>

            {celebrities.length > 0 && (
              <>
                <Divider delay={0.7} />
                <CelebrityCarousel
                  celebrities={celebrities}
                  title={t('sameCore', { core: coreTitle })}
                />
              </>
            )}

            <Divider delay={0.8} />

            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              onClick={onLogin}
              className="w-full max-w-sm py-5 font-light tracking-[0.2em] rounded-full text-lg transition-all duration-500"
              style={{
                background: theme.accent,
                color: '#ffffff',
                boxShadow: theme.glow,
              }}
            >
              {t('loginButton')}
            </motion.button>
          </>
        )}
      </div>
    </div>
  );
}
