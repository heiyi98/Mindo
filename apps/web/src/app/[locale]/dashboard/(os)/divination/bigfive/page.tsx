'use client';
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useBigFiveQuiz } from '@/hooks/useBigFiveQuiz';
import QuestionCard from '@/components/divination/bigfive/QuestionCard';
import BigFiveRadar from '@/components/divination/bigfive/BigFiveRadar';
import BigFiveFacets from '@/components/divination/bigfive/BigFiveFacets';
import type { BigFiveReport } from '@mindo/core';
import { useCurrentProfile } from '@/components/os/CurrentProfileContext';
import { useTopBar } from '@/components/os/TopBarContext';
import ProfileSwitcher from '@/components/dashboard/ProfileSwitcher';

type PageState = 'quiz' | 'submitting' | 'result';

export default function BigFivePage() {
  const t = useTranslations('bigfive');
  const locale = useLocale();
  const { currentProfile } = useCurrentProfile();
  const { setContent } = useTopBar();
  const [pageState, setPageState] = useState<PageState>('quiz');
  const [result, setResult] = useState<BigFiveReport | null>(null);
  const [error, setError] = useState('');
  const [checkingCache, setCheckingCache] = useState(true);

  useEffect(() => {
    setContent({ left: <ProfileSwitcher /> });
    return () => setContent({});
  }, [setContent]);

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
    isComplete,
    isLastQuestion,
    currentAnswered,
    nextAnswered,
  } = useBigFiveQuiz();

  useEffect(() => {
    if (!currentProfile) return;

    // 切换档案时重置所有状态
    reset();
    setResult(null);
    setPageState('quiz');
    setCheckingCache(true);

    fetch(`/api/assessments/status?profile_id=${currentProfile.id}`)
      .then(res => res.json())
      .then(data => {
        const bigfiveStatus = data.status?.find((s: any) => s.id === 'bigfive');
        if (bigfiveStatus?.isCompleted) {
          return fetch(`/api/psychology/bigfive/result?profile_id=${currentProfile.id}`)
            .then(res => res.json())
            .then(data => {
              if (data.result) {
                setResult(data.result);
                setPageState('result');
              }
              // 没有结果时保持 quiz 状态（已在上面设置）
            });
        }
        // 没有完成记录，保持 quiz 状态
      })
      .catch(err => console.error(err))
      .finally(() => setCheckingCache(false));
  }, [currentProfile?.id, reset]);

  const handleSubmit = async () => {
    setPageState('submitting');
    setError('');
    try {
      if (!currentProfile) throw new Error('No profile found');

      const res = await fetch('/api/psychology/bigfive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: getAnswersArray(),
          profile_id: currentProfile.id,
          locale,
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data.result);
      setPageState('result');
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
      <div className="w-full max-w-2xl mx-auto px-4 py-6 space-y-6">
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
              await fetch(`/api/psychology/bigfive/result?profile_id=${currentProfile.id}`, {
                method: 'DELETE',
              });
              setResult(null);
              setPageState('quiz');
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
          className="p-6 rounded-3xl"
          style={{
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
          }}
        >
          <div style={{ height: 300 }}>
            <BigFiveRadar report={result} />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <BigFiveFacets report={result} />
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
