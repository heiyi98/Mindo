'use client';
import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useBigFiveQuiz } from '@/hooks/useBigFiveQuiz';
import QuestionCard from '@/components/divination/bigfive/QuestionCard';
import BigFiveChart from '@/components/divination/bigfive/BigFiveChart';
import BigFiveFacets from '@/components/divination/bigfive/BigFiveFacets';
import BigFiveIntro from '@/components/divination/bigfive/BigFiveIntro';
import type { RegionData } from '@/components/divination/bigfive/BigFiveIntro';
import type { StandardScores } from '@/components/divination/bigfive/BigFiveFacets';
import type { BigFiveReport, BigFiveDomain, BigFiveFacet } from '@mindo/core';
import { useCurrentProfile } from '@/components/os/CurrentProfileContext';
import { useTopBar } from '@/components/os/TopBarContext';
import ProfileSwitcher from '@/components/dashboard/ProfileSwitcher';

type PageState = 'intro' | 'quiz' | 'submitting' | 'result';

const DOMAIN_FACETS: Record<BigFiveDomain, BigFiveFacet[]> = {
  N: ['Anxiety', 'Anger', 'Depression', 'SelfConsciousness', 'Immoderation', 'Vulnerability'],
  E: ['Friendliness', 'Gregariousness', 'Assertiveness', 'ActivityLevel', 'ExcitementSeeking', 'Cheerfulness'],
  O: ['Imagination', 'ArtisticInterests', 'Emotionality', 'Adventurousness', 'Intellect', 'Liberalism'],
  A: ['Trust', 'Morality', 'Altruism', 'Cooperation', 'Modesty', 'Sympathy'],
  C: ['SelfEfficacy', 'Orderliness', 'Dutifulness', 'AchievementStriving', 'SelfDiscipline', 'Cautiousness'],
};

function reconstructReport(
  domainScores: Record<string, number>,
  facetScores: Record<string, number>
): BigFiveReport {
  const domains: BigFiveDomain[] = ['N', 'E', 'O', 'A', 'C'];
  return {
    domains: domains.map(d => ({
      domain: d,
      score: domainScores[d] || 0,
      facets: DOMAIN_FACETS[d].map(f => ({
        facet: f,
        score: facetScores[f] || 0,
      })),
    })),
  };
}

export default function BigFivePage() {
  const t = useTranslations('bigfive');
  const locale = useLocale();
  const { currentProfile } = useCurrentProfile();
  const { setContent } = useTopBar();
  const [pageState, setPageState] = useState<PageState>('intro');
  const [result, setResult] = useState<BigFiveReport | null>(null);
  const [standardScores, setStandardScores] = useState<StandardScores | null>(null);
  const [regionData, setRegionData] = useState<RegionData | null>(null);
  const [error, setError] = useState('');
  const [checkingCache, setCheckingCache] = useState(true);
  const profileIdRef = useRef<string | null>(null);

  useEffect(() => {
    setContent({ left: <ProfileSwitcher /> });
    return () => setContent({});
  }, [setContent]);

  useEffect(() => {
    profileIdRef.current = currentProfile?.id ?? null;
  }, [currentProfile?.id]);

  const {
    currentQuestion,
    currentIndex,
    totalQuestions,
    loadingQuestions,
    answers,
    setAnswer,
    goNext,
    goPrev,
    getAnswersArray,
    reset,
    isLastQuestion,
    currentAnswered,
    nextAnswered,
    devFillAll,
  } = useBigFiveQuiz();

  async function fetchAndSetResult(profileId: string): Promise<boolean> {
    const res = await fetch(`/api/psychology/bigfive/result?profileId=${profileId}`);
    if (res.status === 404) return false;
    const data = await res.json();
    if (data && data.domain_scores && data.facet_scores) {
      setResult(reconstructReport(data.domain_scores, data.facet_scores));
      setStandardScores(data.standard_scores ?? null);
      return true;
    }
    return false;
  }

  useEffect(() => {
    if (!currentProfile) return;

    reset();
    setResult(null);
    setStandardScores(null);
    setRegionData(null);
    setPageState('intro');
    setCheckingCache(true);

    fetchAndSetResult(currentProfile.id)
      .then(found => { if (found) setPageState('result'); })
      .catch(err => console.error(err))
      .finally(() => setCheckingCache(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProfile?.id, reset]);

  const handleStart = (region: RegionData | null) => {
    setRegionData(region);
    setPageState('quiz');
  };

  const handleSubmit = async () => {
    setPageState('submitting');
    setError('');
    try {
      const profileId = profileIdRef.current;
      if (!profileId) throw new Error('No profile found');

      const res = await fetch('/api/psychology/bigfive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: getAnswersArray(),
          profile_id: profileId,
          locale,
          region_country: regionData?.country ?? null,
          region_level1: regionData?.level1 ?? null,
          region_level2: regionData?.level2 ?? null,
          region_level3: regionData?.level3 ?? null,
          region_display_name: regionData?.display_name ?? null,
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setResult(data.result);
      setPageState('result');

      fetchAndSetResult(profileId).catch(() => {});
    } catch (err: any) {
      setError(err.message);
      setPageState('quiz');
    }
  };

  if (checkingCache) {
    return (
      <div className="flex items-center justify-center h-64">
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'hsl(var(--foreground) / 0.3)' }}
        />
      </div>
    );
  }

  if (pageState === 'result' && result) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs font-light tracking-[0.3em] uppercase"
            style={{ color: 'hsl(var(--muted-foreground) / 0.5)' }}
          >
            {t('resultTitle')}
          </motion.h1>

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            onClick={async () => {
              if (!currentProfile) return;
              await fetch(`/api/psychology/bigfive/result?profileId=${currentProfile.id}`, {
                method: 'DELETE',
              });
              setResult(null);
              setStandardScores(null);
              setRegionData(null);
              reset();
              setPageState('intro');
            }}
            className="text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={{
              color: 'hsl(var(--muted-foreground))',
              border: '1px solid hsl(var(--border))',
            }}
          >
            {t('retake')}
          </motion.button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {/* Left column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {standardScores ? (
                <BigFiveChart standardScores={standardScores} />
              ) : (
                <div
                  className="rounded-3xl"
                  style={{
                    height: 260,
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                  }}
                />
              )}
              <div style={{
                background: 'var(--color-background-primary)',
                border: '0.5px solid var(--color-border-tertiary)',
                borderRadius: 'var(--border-radius-lg)',
                padding: '1.25rem',
              }} />
            </div>
            {/* Right column: facet accordion, no wrapping card */}
            <div>
              <BigFiveFacets report={result} standardScores={standardScores} />
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (pageState === 'submitting') {
    return (
      <div className="flex items-center justify-center h-64">
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'hsl(var(--foreground) / 0.3)' }}
        />
      </div>
    );
  }

  if (pageState === 'intro') {
    return <BigFiveIntro onStart={handleStart} />;
  }

  if (loadingQuestions) {
    return (
      <div className="flex items-center justify-center h-64">
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'hsl(var(--foreground) / 0.3)' }}
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1
          className="text-xs font-light tracking-[0.3em] uppercase"
          style={{ color: 'hsl(var(--muted-foreground) / 0.5)' }}
        >
          {t('title')}
        </h1>
        <span
          className="text-xs font-light"
          style={{ color: 'hsl(var(--muted-foreground))' }}
        >
          {currentIndex + 1} / {totalQuestions}
        </span>
      </div>

      <div
        className="w-full h-1 rounded-full mb-8 overflow-hidden"
        style={{ background: 'hsl(var(--muted))' }}
      >
        <div
          className="h-full rounded-full transition-none"
          style={{
            background: 'hsl(var(--foreground) / 0.4)',
            width: `${Math.round(Object.keys(answers).length / 120 * 100)}%`,
          }}
        />
      </div>

      <div className="space-y-3 mb-8">
        <QuestionCard
          key={currentQuestion.id}
          questionId={currentQuestion.id}
          questionText={currentQuestion.text}
          currentScore={answers[currentQuestion.id]}
          onAnswer={(score) => setAnswer(currentQuestion.id, score)}
        />
      </div>

      {process.env.NODE_ENV === 'development' && (
        <button
          onClick={devFillAll}
          className="text-xs px-2 py-1 mb-2 rounded opacity-40 hover:opacity-80"
          style={{ border: '1px dashed hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }}
        >
          [DEV] Fill all
        </button>
      )}

      {error && (
        <p className="text-sm mb-4" style={{ color: 'hsl(var(--destructive))' }}>
          {error}
        </p>
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={goPrev}
          disabled={currentIndex === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-light disabled:opacity-30 transition-opacity"
          style={{ color: 'hsl(var(--muted-foreground))' }}
        >
          <ChevronLeft size={16} />
          {t('prev')}
        </button>

        {isLastQuestion && currentAnswered ? (
          <button
            onClick={handleSubmit}
            className="px-8 py-3 rounded-full text-sm font-light transition-all"
            style={{
              background: 'hsl(var(--foreground))',
              color: 'hsl(var(--background))',
            }}
          >
            {t('submit')}
          </button>
        ) : (
          <button
            onClick={goNext}
            disabled={!nextAnswered && !currentAnswered}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-light disabled:opacity-30 transition-opacity"
            style={{ color: 'hsl(var(--foreground))' }}
          >
            {t('next')}
            <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
