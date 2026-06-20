'use client';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import type { BigFiveReport } from '@mindo/core';

interface BigFiveScoreCardProps {
  report: BigFiveReport;
}

const MAX_DOMAIN_SCORE = 120;

export default function BigFiveScoreCard({ report }: BigFiveScoreCardProps) {
  const t = useTranslations('bigfive.domains');

  const DOMAIN_COLORS: Record<string, string> = {
    O: '#8b5cf6',
    C: '#3b82f6',
    E: '#f59e0b',
    A: '#10b981',
    N: '#f43f5e',
  };

  return (
    <div className="w-full space-y-4">
      {report.domains.map((domain, idx) => {
        const percentage = Math.round((domain.score / MAX_DOMAIN_SCORE) * 100);
        const color = DOMAIN_COLORS[domain.domain];
        return (
          <motion.div
            key={domain.domain}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="p-4 rounded-2xl"
            style={{
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <span
                className="text-sm font-light tracking-wider"
                style={{ color: 'hsl(var(--foreground))' }}
              >
                {t(domain.domain as any)}
              </span>
              <span
                className="text-lg font-light"
                style={{ color }}
              >
                {percentage}
              </span>
            </div>

            <div
              className="w-full h-1.5 rounded-full overflow-hidden"
              style={{ background: 'hsl(var(--muted))' }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ delay: idx * 0.1 + 0.3, duration: 0.8, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ background: color }}
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
