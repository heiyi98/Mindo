'use client';
import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import type { BigFiveUserAnswer } from '@mindo/core';

interface Question {
  id: string;
  text: string;
}

const TOTAL_QUESTIONS = 120;

export function useBigFiveQuiz() {
  const tQuestions = useTranslations('bigfive.questions');

  const questions: Question[] = Array.from(
    { length: TOTAL_QUESTIONS },
    (_, i) => {
      const id = `q${String(i + 1).padStart(3, '0')}`;
      return { id, text: tQuestions(id) };
    }
  );

  const [answers, setAnswersState] = useState<Record<string, number>>({});
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentQuestion = questions[currentIndex];

  const setAnswer = useCallback((questionId: string, score: number) => {
    // 先记录答案（立即显示选中效果）
    setAnswersState(prev => ({ ...prev, [questionId]: score }));
    // 150ms后跳下一题（用户能看到选中效果，又感觉流畅）
    setTimeout(() => {
      setCurrentIndex(prev => {
        if (prev < TOTAL_QUESTIONS - 1) return prev + 1;
        return prev;
      });
    }, 150);
  }, []);

  const goNext = useCallback(() => {
    setCurrentIndex(prev => Math.min(prev + 1, TOTAL_QUESTIONS - 1));
  }, []);

  const goPrev = useCallback(() => {
    setCurrentIndex(prev => Math.max(prev - 1, 0));
  }, []);

  const isComplete = Object.keys(answers).length === TOTAL_QUESTIONS;
  const isLastQuestion = currentIndex === TOTAL_QUESTIONS - 1;
  const currentAnswered = answers[currentQuestion?.id] !== undefined;
  const nextAnswered = currentIndex < TOTAL_QUESTIONS - 1
    ? answers[questions[currentIndex + 1]?.id] !== undefined
    : false;

  const getAnswersArray = useCallback((): BigFiveUserAnswer[] => {
    return Object.entries(answers).map(([questionId, score]) => ({
      questionId,
      score,
    }));
  }, [answers]);

  const reset = useCallback(() => {
    setAnswersState({});
    setCurrentIndex(0);
  }, []);

  return {
    questions,
    currentQuestion,
    currentIndex,
    totalQuestions: TOTAL_QUESTIONS,
    answers,
    setAnswer,
    goNext,
    goPrev,
    isComplete,
    isLastQuestion,
    currentAnswered,
    nextAnswered,
    getAnswersArray,
    reset,
    loadingQuestions: false,
  };
}
