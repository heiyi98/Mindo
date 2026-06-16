'use client';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

const ELEMENT_COLORS: Record<string, string> = {
  Wood: '#10b981',
  Fire: '#f43f5e',
  Earth: '#f59e0b',
  Metal: '#94a3b8',
  Water: '#3b82f6',
  gray: '#6b7280',
};

interface TianGanNode {
  pos: string;
  stem: string;
  wuxing: string;
}

interface Pillar {
  stem: string;
  branch: string;
  shishenStem?: string;
}

interface BaziChartProps {
  pillars: {
    year?: Pillar;
    month?: Pillar;
    day?: Pillar;
    hour?: Pillar;
  };
  tianGanNodes: TianGanNode[];
  dayStem: string;
}

const UNKNOWN_PILLAR: Pillar = { stem: '?', branch: '?' };

export default function BaziChart({ pillars, tianGanNodes, dayStem }: BaziChartProps) {
  const t = useTranslations('bazi');

  const wuxingByPos = new Map(
    tianGanNodes.map(n => [n.pos, n.wuxing])
  );

  const columns = [
    { key: 'year',  label: t('year'),  pillar: pillars.year  ?? UNKNOWN_PILLAR, pos: 'YearStem',  branchPos: 'YearBranch'  },
    { key: 'month', label: t('month'), pillar: pillars.month ?? UNKNOWN_PILLAR, pos: 'MonthStem', branchPos: 'MonthBranch' },
    { key: 'day',   label: t('day'),   pillar: pillars.day   ?? UNKNOWN_PILLAR, pos: 'DayStem',   branchPos: 'DayBranch'   },
    { key: 'hour',  label: t('hour'),  pillar: pillars.hour  ?? UNKNOWN_PILLAR, pos: 'HourStem',  branchPos: 'HourBranch'  },
  ];

  return (
    <div className="w-full">
      <h3
        className="text-xs font-light tracking-[0.3em] uppercase mb-6"
        style={{ color: 'hsl(var(--muted-foreground) / 0.6)' }}
      >
        {t('title')}
      </h3>

      <div className="grid grid-cols-4 gap-3">
        {columns.map(({ key, label, pillar, pos, branchPos }, idx) => {
          const stemWuxing = wuxingByPos.get(pos) || 'gray';
          const branchWuxing = wuxingByPos.get(branchPos) || 'gray';
          const stemColor = ELEMENT_COLORS[stemWuxing] ?? ELEMENT_COLORS['gray'];
          const branchColor = ELEMENT_COLORS[branchWuxing] ?? ELEMENT_COLORS['gray'];
          const isDay = key === 'day';
          const isUnknown = !pillar.stem || pillar.stem === '?' || pillar.stem === 'Unknown';

          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="flex flex-col items-center rounded-2xl py-5 px-2"
              style={{
                background: isDay
                  ? 'hsl(var(--foreground) / 0.06)'
                  : 'hsl(var(--card))',
                border: `1px solid ${isDay
                  ? 'hsl(var(--foreground) / 0.15)'
                  : 'hsl(var(--border))'}`,
              }}
            >
              <span
                className="text-xs mb-1 tracking-widest"
                style={{ color: 'hsl(var(--muted-foreground))' }}
              >
                {label}
              </span>

              {pillar.shishenStem && !isDay && (
                <span
                  className="text-xs mb-3 tracking-wider"
                  style={{ color: 'hsl(var(--muted-foreground) / 0.7)' }}
                >
                  {t(`shishen.${pillar.shishenStem}`, { fallback: pillar.shishenStem })}
                </span>
              )}

              {isDay && (
                <span
                  className="text-xs mb-3 tracking-wider"
                  style={{ color: 'hsl(var(--muted-foreground) / 0.7)' }}
                >
                  {t('daymaster')}
                </span>
              )}

              {isUnknown ? (
                <div className="flex flex-col items-center gap-6 my-2">
                  <span style={{ color: 'hsl(var(--muted-foreground) / 0.3)', fontSize: 32 }}>?</span>
                  <span style={{ color: 'hsl(var(--muted-foreground) / 0.3)', fontSize: 32 }}>?</span>
                </div>
              ) : (
                <>
                  <span
                    className="font-light my-1"
                    style={{
                      color: stemColor,
                      fontSize: 40,
                      lineHeight: 1.1,
                      textShadow: `0 0 20px ${stemColor}66`,
                    }}
                  >
                    {pillar.stem}
                  </span>
                  <span
                    className="font-light my-1"
                    style={{
                      color: branchColor,
                      fontSize: 40,
                      lineHeight: 1.1,
                      textShadow: `0 0 20px ${branchColor}66`,
                    }}
                  >
                    {pillar.branch}
                  </span>
                </>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
