'use client';
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { FullModeResult } from '@mindo/core';

const ZODIAC_SIGNS = [
  'Aries','Taurus','Gemini','Cancer',
  'Leo','Virgo','Libra','Scorpio',
  'Sagittarius','Capricorn','Aquarius','Pisces',
] as const;

const ZODIAC_SYMBOLS: Record<string, string> = {
  Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋',
  Leo: '♌', Virgo: '♍', Libra: '♎', Scorpio: '♏',
  Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
};

const PLANET_SYMBOLS: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
};

const PLANET_COLORS: Record<string, string> = {
  Sun: '#f59e0b', Moon: '#94a3b8', Mercury: '#a78bfa',
  Venus: '#f472b6', Mars: '#ef4444', Jupiter: '#3b82f6',
  Saturn: '#78716c', Uranus: '#06b6d4', Neptune: '#8b5cf6', Pluto: '#dc2626',
};

const ELEMENT_COLORS: Record<string, string> = {
  Aries: '#ef4444', Leo: '#ef4444', Sagittarius: '#ef4444',
  Taurus: '#22c55e', Virgo: '#22c55e', Capricorn: '#22c55e',
  Gemini: '#f59e0b', Libra: '#f59e0b', Aquarius: '#f59e0b',
  Cancer: '#3b82f6', Scorpio: '#3b82f6', Pisces: '#3b82f6',
};

interface StarChartWheelProps {
  result: FullModeResult;
}

export default function StarChartWheel({ result }: StarChartWheelProps) {
  const size = 500;
  const cx = size / 2;
  const cy = size / 2;

  const R_OUTER = 220;
  const R_ZODIAC = 200;
  const R_ZODIAC_IN = 165;
  const R_HOUSE = 155;
  const R_HOUSE_IN = 90;
  const R_PLANET = 125;

  const ascLon = result.angles.asc;

  const lonToAngle = (lon: number): number => {
    const relative = lon - ascLon;
    return -(relative) * (Math.PI / 180);
  };

  const polarToXY = (angle: number, r: number) => ({
    x: cx + r * Math.cos(angle - Math.PI / 2),
    y: cy + r * Math.sin(angle - Math.PI / 2),
  });

  const zodiacSectors = useMemo(() => {
    return ZODIAC_SIGNS.map((sign, i) => {
      const startAngle = lonToAngle(i * 30);
      const endAngle = lonToAngle((i + 1) * 30);
      const midAngle = lonToAngle(i * 30 + 15);

      const outerStart = polarToXY(startAngle, R_ZODIAC);
      const outerEnd = polarToXY(endAngle, R_ZODIAC);
      const innerStart = polarToXY(startAngle, R_ZODIAC_IN);
      const innerEnd = polarToXY(endAngle, R_ZODIAC_IN);
      const symbolPos = polarToXY(midAngle, (R_ZODIAC + R_ZODIAC_IN) / 2);

      const path = [
        `M ${outerStart.x} ${outerStart.y}`,
        `A ${R_ZODIAC} ${R_ZODIAC} 0 0 0 ${outerEnd.x} ${outerEnd.y}`,
        `L ${innerEnd.x} ${innerEnd.y}`,
        `A ${R_ZODIAC_IN} ${R_ZODIAC_IN} 0 0 1 ${innerStart.x} ${innerStart.y}`,
        'Z',
      ].join(' ');

      return { sign, path, symbolPos, color: ELEMENT_COLORS[sign] };
    });
  }, [ascLon]); // eslint-disable-line react-hooks/exhaustive-deps

  const houseLines = useMemo(() => {
    return result.houses.cusps.map(cusp => {
      const angle = lonToAngle(cusp.longitude);
      const outer = polarToXY(angle, R_HOUSE);
      const inner = polarToXY(angle, R_HOUSE_IN);
      const isAngular = [1, 4, 7, 10].includes(cusp.house);
      return { cusp, outer, inner, isAngular };
    });
  }, [result.houses.cusps, ascLon]); // eslint-disable-line react-hooks/exhaustive-deps

  const planetPositions = useMemo(() => {
    const sorted = [...result.planets].sort((a, b) => a.longitude - b.longitude);
    return sorted.map((planet, idx) => {
      const angle = lonToAngle(planet.longitude);
      const r = R_PLANET + (idx % 3) * 12;
      const pos = polarToXY(angle, r);
      return { planet, pos };
    });
  }, [result.planets, ascLon]); // eslint-disable-line react-hooks/exhaustive-deps

  const ascAngle = lonToAngle(ascLon);
  const ascLabelPos = polarToXY(ascAngle, R_OUTER + 15);

  return (
    <div className="w-full flex items-center justify-center">
      <svg width="100%" viewBox={`0 0 ${size} ${size}`} style={{ maxWidth: 500 }}>
        {/* 外圈 */}
        <circle cx={cx} cy={cy} r={R_OUTER} fill="none" stroke="hsl(var(--border))" strokeWidth="1" />

        {/* 黄道带扇形 */}
        {zodiacSectors.map(({ sign, path, symbolPos, color }) => (
          <g key={sign}>
            <path d={path} fill={`${color}15`} stroke="hsl(var(--border))" strokeWidth="0.5" />
            <text
              x={symbolPos.x} y={symbolPos.y}
              textAnchor="middle" dominantBaseline="middle"
              fontSize="12" fill={color} opacity="0.8"
            >
              {ZODIAC_SYMBOLS[sign]}
            </text>
          </g>
        ))}

        {/* 黄道带内圈 */}
        <circle cx={cx} cy={cy} r={R_ZODIAC_IN} fill="none" stroke="hsl(var(--border))" strokeWidth="1" />

        {/* 宫位内圈 */}
        <circle cx={cx} cy={cy} r={R_HOUSE_IN} fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" />

        {/* 宫位线 */}
        {houseLines.map(({ cusp, outer, inner, isAngular }) => (
          <line
            key={cusp.house}
            x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
            stroke="hsl(var(--border))"
            strokeWidth={isAngular ? 1.5 : 0.8}
            opacity={isAngular ? 1 : 0.6}
          />
        ))}

        {/* 宫位编号 */}
        {result.houses.cusps.map((cusp) => {
          const nextCusp = result.houses.cusps[cusp.house % 12];
          const midLon = (cusp.longitude + nextCusp.longitude) / 2;
          const pos = polarToXY(lonToAngle(midLon), (R_HOUSE + R_HOUSE_IN) / 2);
          return (
            <text
              key={cusp.house}
              x={pos.x} y={pos.y}
              textAnchor="middle" dominantBaseline="middle"
              fontSize="10"
              fill="hsl(var(--muted-foreground))"
              opacity="0.6"
            >
              {cusp.house}
            </text>
          );
        })}

        {/* 行星 */}
        {planetPositions.map(({ planet, pos }) => (
          <motion.text
            key={planet.name}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            x={pos.x} y={pos.y}
            textAnchor="middle" dominantBaseline="middle"
            fontSize="14"
            fill={PLANET_COLORS[planet.name]}
            style={{ cursor: 'default' }}
          >
            {PLANET_SYMBOLS[planet.name]}{planet.isRetrograde ? 'ℛ' : ''}
          </motion.text>
        ))}

        {/* ASC标注 */}
        <text
          x={ascLabelPos.x} y={ascLabelPos.y}
          textAnchor="middle" dominantBaseline="middle"
          fontSize="10" fill="hsl(var(--foreground))" fontWeight="bold"
        >
          ASC
        </text>

        {/* 中心圆 */}
        <circle
          cx={cx} cy={cy} r={R_HOUSE_IN - 5}
          fill="hsl(var(--background))"
          stroke="hsl(var(--border))"
          strokeWidth="0.5"
        />
      </svg>
    </div>
  );
}
