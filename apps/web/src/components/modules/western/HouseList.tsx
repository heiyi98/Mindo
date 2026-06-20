'use client';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import type { FullModeResult } from '@mindo/core';

interface HouseListProps {
  houses: FullModeResult['houses'];
  angles: FullModeResult['angles'];
}

const ANGLE_LABELS: Record<number, string> = { 1: 'ASC', 4: 'IC', 7: 'DESC', 10: 'MC' };

export default function HouseList({ houses, angles: _angles }: HouseListProps) {
  const t = useTranslations('western');

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
    >
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: '1px solid hsl(var(--border))' }}
      >
        <h3
          className="text-xs font-light tracking-[0.2em] uppercase"
          style={{ color: 'hsl(var(--muted-foreground) / 0.6)' }}
        >
          {t('houses')}
        </h3>
        <span className="text-xs" style={{ color: 'hsl(var(--muted-foreground) / 0.5)' }}>
          {houses.systemUsed}
        </span>
      </div>

      {houses.warning && (
        <div
          className="px-4 py-2 text-xs"
          style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }}
        >
          {houses.warning}
        </div>
      )}

      {houses.cusps.map((cusp, idx) => {
        const angleLabel = ANGLE_LABELS[cusp.house];
        return (
          <motion.div
            key={cusp.house}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.03 }}
          >
            {idx > 0 && <div style={{ height: 1, background: 'hsl(var(--border) / 0.5)' }} />}
            <div className="flex items-center justify-between px-4 py-2.5">
              <div className="flex items-center gap-3">
                <span
                  className="text-xs w-6 text-center font-light"
                  style={{
                    color: angleLabel ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
                    fontWeight: angleLabel ? 500 : 300,
                  }}
                >
                  {cusp.house}
                </span>
                {angleLabel && (
                  <span
                    className="text-xs px-1.5 py-0.5 rounded"
                    style={{
                      background: 'hsl(var(--foreground) / 0.08)',
                      color: 'hsl(var(--foreground))',
                    }}
                  >
                    {angleLabel}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-light" style={{ color: 'hsl(var(--foreground))' }}>
                  {t(`signs.${cusp.sign}`)}
                </span>
                <span
                  className="text-xs w-12 text-right"
                  style={{ color: 'hsl(var(--muted-foreground))' }}
                >
                  {cusp.longitude.toFixed(1)}°
                </span>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
