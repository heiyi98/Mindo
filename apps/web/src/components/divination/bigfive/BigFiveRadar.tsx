'use client';
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import type { StandardScores } from '@/components/divination/bigfive/BigFiveFacets';

const DOMAIN_TO_FULL: Record<string, string> = {
  N: 'NEUROTICISM',
  E: 'EXTRAVERSION',
  O: 'OPENNESS',
  A: 'AGREEABLENESS',
  C: 'CONSCIENTIOUSNESS',
};

const MIN_T = 20;
const MAX_T = 80;

function tToScale(t: number): number {
  return (t - MIN_T) / (MAX_T - MIN_T);
}

interface BigFiveRadarProps {
  standardScores: StandardScores | null | undefined;
}

export default function BigFiveRadar({ standardScores }: BigFiveRadarProps) {
  const t = useTranslations('bigfive.domains');
  const size = 300;
  const center = size / 2;
  const radius = 110;

  const domains = ['O', 'C', 'E', 'A', 'N'];

  const points = useMemo(() => {
    return domains.map((d, i) => {
      const entry = standardScores?.domains[DOMAIN_TO_FULL[d]];
      const scale = entry ? tToScale(entry.t) : 0;
      const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
      return {
        domain: d,
        x: center + radius * scale * Math.cos(angle),
        y: center + radius * scale * Math.sin(angle),
        labelX: center + (radius * 1.3) * Math.cos(angle),
        labelY: center + (radius * 1.3) * Math.sin(angle),
      };
    });
  }, [standardScores]);

  if (!standardScores) {
    return (
      <div
        className="w-full h-full flex items-center justify-center"
        style={{ color: 'hsl(var(--muted-foreground) / 0.2)' }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${size} ${size}`}
          style={{ maxWidth: 300 }}
        >
          {domains.map((_, i) => {
            const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
            const x = center + radius * Math.cos(angle);
            const y = center + radius * Math.sin(angle);
            return (
              <line
                key={i}
                x1={center} y1={center}
                x2={x} y2={y}
                stroke="currentColor" strokeWidth="1" strokeDasharray="3 2"
              />
            );
          })}
          <polygon
            points={domains.map((_, i) => {
              const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
              return `${center + radius * Math.cos(angle)},${center + radius * Math.sin(angle)}`;
            }).join(' ')}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      </div>
    );
  }

  const polygonPoints = points.map(p => `${p.x},${p.y}`).join(' ');

  const gridRing = domains.map((_, i) => {
    const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    return `${center + radius * Math.cos(angle)},${center + radius * Math.sin(angle)}`;
  }).join(' ');

  // Reference ring at T=50 (average)
  const avgRing = domains.map((_, i) => {
    const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    const r = radius * tToScale(50);
    return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
  }).join(' ');

  return (
    <div className="relative w-full flex items-center justify-center">
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible"
        style={{ maxWidth: 300 }}
      >
        <g style={{ color: 'hsl(var(--foreground) / 0.15)' }}>
          <polygon points={gridRing} fill="none" stroke="currentColor" strokeWidth="1.5" />
          <polygon
            points={avgRing}
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="4 3"
          />
          {domains.map((_, i) => {
            const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
            return (
              <line
                key={i}
                x1={center} y1={center}
                x2={center + radius * Math.cos(angle)}
                y2={center + radius * Math.sin(angle)}
                stroke="currentColor" strokeWidth="1" strokeDasharray="3 2"
              />
            );
          })}
        </g>

        <motion.polygon
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          points={polygonPoints}
          className="fill-foreground/10 stroke-foreground stroke-[2]"
          style={{ filter: 'drop-shadow(0 0 12px rgba(255,255,255,0.1))' }}
        />

        {points.map(({ domain, labelX, labelY }) => (
          <text
            key={domain}
            x={labelX}
            y={labelY}
            textAnchor="middle"
            alignmentBaseline="middle"
            className="text-xs font-light"
            style={{
              fill: 'hsl(var(--muted-foreground))',
              fontSize: 11,
            }}
          >
            {t(domain as any)}
          </text>
        ))}
      </svg>
    </div>
  );
}
