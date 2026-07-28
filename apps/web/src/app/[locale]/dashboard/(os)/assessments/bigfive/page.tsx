'use client';
import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Copy, Check, MapPin } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBigFiveQuiz } from '@/hooks/useBigFiveQuiz';
import QuestionCard from '@/components/modules/bigfive/QuestionCard';
import BigFiveChart from '@/components/modules/bigfive/BigFiveChart';
import BigFiveFacets from '@/components/modules/bigfive/BigFiveFacets';
import BigFiveIntro from '@/components/modules/bigfive/BigFiveIntro';
import type { RegionData } from '@/components/modules/bigfive/BigFiveIntro';
import type { StandardScores } from '@/components/modules/bigfive/BigFiveFacets';
import type { BigFiveReport, BigFiveDomain, BigFiveFacet } from '@mindo/core';
import { useCurrentProfile } from '@/components/os/CurrentProfileContext';
import { useTopBar } from '@/components/os/TopBarContext';
import ProfileSwitcher from '@/components/dashboard/ProfileSwitcher';

type PageState = 'intro' | 'quiz' | 'submitting' | 'result';

function bigfiveResultQueryKey(profileId: string) {
  return ['bigfive-full-result', profileId] as const;
}

async function fetchBigfiveFullResult(profileId: string) {
  const res = await fetch(`/api/psychology/bigfive/result?profileId=${profileId}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch bigfive result');
  return res.json();
}

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
  const queryClient = useQueryClient();
  const [pageState, setPageState] = useState<PageState>('intro');
  // 刚提交完quiz那一刻的即时结果——POST接口本身只返回reconstruct好的report，
  // 不含standardScores/assessmentId/region这些字段（那些字段只有GET结果接口才有），
  // 所以提交成功先用这份本地即时结果顶上，背后的resultQuery静默刷新到位后，
  // standardScores等字段自然跟上，行为跟原来一致（不是刻意补的新体验）。
  const [submittedResult, setSubmittedResult] = useState<BigFiveReport | null>(null);
  // 引导页选好城市之后暂存的地区信息，跟"已存在的评测结果关联的地区"是两个
  //概念（前者是待提交的草稿，后者来自查询结果），故意不合并成一个状态。
  const [selectedRegionData, setSelectedRegionData] = useState<RegionData | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const profileIdRef = useRef<string | null>(null);
  const outerRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState(120);

  const resultQuery = useQuery({
    queryKey: bigfiveResultQueryKey(currentProfile?.id ?? ''),
    queryFn: () => fetchBigfiveFullResult(currentProfile!.id),
    enabled: !!currentProfile,
  });
  const checkingCache = resultQuery.isLoading;
  const result: BigFiveReport | null = submittedResult ?? (resultQuery.data
    ? reconstructReport(resultQuery.data.domain_scores, resultQuery.data.facet_scores)
    : null);
  const standardScores: StandardScores | null = resultQuery.data?.standard_scores ?? null;
  const assessmentId: string | null = resultQuery.data?.id ?? null;
  const regionData: RegionData | null = resultQuery.data?.region ? {
    country: resultQuery.data.region.country,
    level1: resultQuery.data.region.level1,
    level2: resultQuery.data.region.level2,
    level3: resultQuery.data.region.level3,
    display_name: resultQuery.data.region.display_name,
  } : null;

  useEffect(() => {
    setContent({ left: <ProfileSwitcher /> });
    return () => setContent({});
  }, [setContent]);

  useEffect(() => {
    profileIdRef.current = currentProfile?.id ?? null;
  }, [currentProfile?.id]);

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const calc = (w: number) => {
      const contentW = Math.min(w - 32, 576);
      setCellSize(Math.floor((contentW - 3 * 16) / 4));
    };
    calc(el.getBoundingClientRect().width);
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) calc(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [pageState]);

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

  // 切换档案：quiz进度清空重来，回到intro——resultQuery按profileId分别缓存，
  // 会自动重新拉取新档案对应的数据，不需要手动清空result相关状态。
  useEffect(() => {
    if (!currentProfile) return;
    reset();
    setSubmittedResult(null);
    setSelectedRegionData(null);
    setPageState('intro');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProfile?.id, reset]);

  // resultQuery拉到数据（说明这个档案已经测过）就直接跳到结果页
  useEffect(() => {
    if (resultQuery.data) setPageState('result');
  }, [resultQuery.data]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const profileId = profileIdRef.current;
      if (!profileId) throw new Error('No profile found');
      const res = await fetch('/api/psychology/bigfive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: getAnswersArray(),
          profile_id: profileId,
          locale,
          region_country: selectedRegionData?.country ?? null,
          region_level1: selectedRegionData?.level1 ?? null,
          region_level2: selectedRegionData?.level2 ?? null,
          region_level3: selectedRegionData?.level3 ?? null,
          region_display_name: selectedRegionData?.display_name ?? null,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data.result as BigFiveReport;
    },
    onSuccess: (report) => {
      setSubmittedResult(report);
      setPageState('result');
      // 静默刷新，把standardScores/assessmentId/region这些POST接口本身不返回
      // 的字段补齐——跟原有行为一致，用户不会等这一步，先看到即时结果。
      resultQuery.refetch();
    },
    onError: (err: any) => {
      setError(err.message);
      setPageState('quiz');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!currentProfile) return;
      await fetch(`/api/psychology/bigfive/result?profileId=${currentProfile.id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.setQueryData(bigfiveResultQueryKey(currentProfile?.id ?? ''), null);
      setSubmittedResult(null);
      reset();
      setPageState('intro');
    },
  });

  const handleStart = (region: RegionData | null) => {
    setSelectedRegionData(region);
    setPageState('quiz');
  };

  const handleImportSuccess = async () => {
    if (!currentProfile) return;
    const { data } = await resultQuery.refetch();
    if (data) setPageState('result');
  };

  const handleSubmit = () => {
    setPageState('submitting');
    setError('');
    submitMutation.mutate();
  };

  const handleCopyId = () => {
    if (!assessmentId) return;
    navigator.clipboard.writeText(assessmentId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
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

  if (pageState === 'result' && result && currentProfile) {
    const normLabel = regionData?.display_name ?? t('normGlobal');

    return (
      <div ref={outerRef} className="w-full px-4 py-6">
        <div className="max-w-xl mx-auto space-y-6">
          {/* 标题行 */}
          <div className="flex items-center justify-between">
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs font-light tracking-[0.3em] uppercase"
              style={{ color: 'hsl(var(--muted-foreground) / 0.5)' }}
            >
              {t('resultTitle')}
            </motion.h1>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-2"
            >
              <button
                onClick={handleCopyId}
                disabled={!assessmentId}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-30"
                style={{
                  color: 'hsl(var(--muted-foreground))',
                  border: '1px solid hsl(var(--border))',
                }}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? t('shareCopied') : t('share')}
              </button>

              <button
                onClick={() => deleteMutation.mutate()}
                className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                style={{
                  color: 'hsl(var(--muted-foreground))',
                  border: '1px solid hsl(var(--border))',
                }}
              >
                {t('retake')}
              </button>
            </motion.div>
          </div>

          {/* 常模地区提示 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="flex items-center gap-1.5"
          >
            <MapPin size={11} style={{ color: 'hsl(var(--muted-foreground) / 0.5)' }} />
            <span
              className="text-xs font-light"
              style={{ color: 'hsl(var(--muted-foreground) / 0.5)' }}
            >
              {t('normLabel', { region: normLabel })}
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gridAutoRows: `${cellSize}px`,
                gap: '16px',
              }}
            >
              <div style={{ gridColumn: '1 / span 2', gridRow: '1 / span 2', aspectRatio: '1/1' }}>
                <BigFiveChart profileId={currentProfile.id} />
              </div>
              <div style={{ gridColumn: '3 / span 2', gridRow: '1 / -1', height: 'auto', alignSelf: 'start' }}>
                <BigFiveFacets report={result} standardScores={standardScores} />
              </div>
            </div>
          </motion.div>
        </div>
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
    return (
      <BigFiveIntro
        onStart={handleStart}
        onImportSuccess={handleImportSuccess}
        profileId={currentProfile?.id ?? null}
      />
    );
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