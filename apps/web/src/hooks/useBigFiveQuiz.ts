'use client';
import { useState, useCallback, useEffect } from 'react';
import { useLocale } from 'next-intl';
import type { BigFiveUserAnswer } from '@mindo/core';

interface Question {
  id: string;
  text: string;
}

const QUESTIONS_PER_PAGE = 5;
const TOTAL_QUESTIONS = 120;

export function useBigFiveQuiz() {
  const locale = useLocale();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    setLoadingQuestions(true);
    fetch(`/api/psychology/bigfive/questions?locale=${locale}`)
      .then(res => res.json())
      .then(data => setQuestions(data.questions || []))
      .catch(() => {
        fetch('/api/psychology/bigfive/questions?locale=en')
          .then(res => res.json())
          .then(data => setQuestions(data.questions || []));
      })
      .finally(() => setLoadingQuestions(false));
  }, [locale]);

  const totalPages = Math.ceil(TOTAL_QUESTIONS / QUESTIONS_PER_PAGE);

  const currentQuestions = questions.slice(
    currentPage * QUESTIONS_PER_PAGE,
    (currentPage + 1) * QUESTIONS_PER_PAGE
  );

  const setAnswer = useCallback((questionId: string, score: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: score }));
  }, []);

  const currentPageAnswered = currentQuestions.length > 0 &&
    currentQuestions.every(q => answers[q.id] !== undefined);

  const nextPage = useCallback(() => {
    if (currentPage < totalPages - 1) setCurrentPage(p => p + 1);
  }, [currentPage, totalPages]);

  const prevPage = useCallback(() => {
    if (currentPage > 0) setCurrentPage(p => p - 1);
  }, [currentPage]);

  const getFormattedAnswers = useCallback((): BigFiveUserAnswer[] => {
    return Object.entries(answers).map(([questionId, score]) => ({
      questionId,
      score,
    }));
  }, [answers]);

  const reset = useCallback(() => {
    setAnswers({});
    setCurrentPage(0);
  }, []);

  const progress = Math.round(
    (Object.keys(answers).length / TOTAL_QUESTIONS) * 100
  );

  return {
    currentPage,
    totalPages,
    currentQuestions,
    questions,
    loadingQuestions,
    answers,
    setAnswer,
    currentPageAnswered,
    nextPage,
    prevPage,
    getFormattedAnswers,
    reset,
    progress,
    isComplete: Object.keys(answers).length === TOTAL_QUESTIONS,
  };
}
