'use client';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

export default function DailyFortunePlaceholder() {
  const t = useTranslations('dashboard.fortune');

  return (
    <div className="w-full h-full flex flex-col items-center justify-center py-8">
      <h3
        className="text-xs font-light tracking-[0.3em] uppercase mb-6 self-start"
        style={{ color: 'hsl(var(--muted-foreground) / 0.6)' }}
      >
        {t('title')}
      </h3>

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
        className="relative flex items-center justify-center"
        style={{ width: 120, height: 120 }}
      >
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle
            cx="60" cy="60" r="50"
            fill="none"
            stroke="hsl(var(--muted) / 0.3)"
            strokeWidth="8"
          />
          <circle
            cx="60" cy="60" r="50"
            fill="none"
            stroke="hsl(var(--muted-foreground) / 0.2)"
            strokeWidth="8"
            strokeDasharray="314"
            strokeDashoffset="94"
            strokeLinecap="round"
            transform="rotate(-90 60 60)"
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span
            className="text-3xl font-light"
            style={{ color: 'hsl(var(--foreground) / 0.4)' }}
          >
            —
          </span>
        </div>
      </motion.div>

      <p
        className="text-xs mt-4 tracking-wider"
        style={{ color: 'hsl(var(--muted-foreground) / 0.4)' }}
      >
        {t('comingSoon')}
      </p>
    </div>
  );
}
