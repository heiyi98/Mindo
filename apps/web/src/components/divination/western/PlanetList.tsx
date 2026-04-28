'use client';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import type { PlanetPosition } from '@mindo/core';

const PLANET_SYMBOLS: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
};

const PLANET_COLORS: Record<string, string> = {
  Sun: '#f59e0b', Moon: '#94a3b8', Mercury: '#a78bfa',
  Venus: '#f472b6', Mars: '#ef4444', Jupiter: '#3b82f6',
  Saturn: '#78716c', Uranus: '#06b6d4', Neptune: '#8b5cf6', Pluto: '#dc2626',
};

interface PlanetListProps {
  planets: PlanetPosition[];
}

export default function PlanetList({ planets }: PlanetListProps) {
  const t = useTranslations('western');

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
    >
      <div className="px-4 py-3" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
        <h3
          className="text-xs font-light tracking-[0.2em] uppercase"
          style={{ color: 'hsl(var(--muted-foreground) / 0.6)' }}
        >
          {t('planets')}
        </h3>
      </div>
      {planets.map((planet, idx) => (
        <motion.div
          key={planet.name}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.04 }}
        >
          {idx > 0 && <div style={{ height: 1, background: 'hsl(var(--border) / 0.5)' }} />}
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <span
                className="text-lg w-6 text-center"
                style={{ color: PLANET_COLORS[planet.name] }}
              >
                {PLANET_SYMBOLS[planet.name]}
              </span>
              <span className="text-sm font-light" style={{ color: 'hsl(var(--foreground))' }}>
                {t(`planetNames.${planet.name}`)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-light" style={{ color: 'hsl(var(--foreground))' }}>
                {t(`signs.${planet.sign ?? ''}`)}
              </span>
              <span
                className="text-xs w-12 text-right"
                style={{ color: 'hsl(var(--muted-foreground))' }}
              >
                {planet.degree.toFixed(1)}°
              </span>
              {planet.isRetrograde && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }}
                >
                  R
                </span>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
