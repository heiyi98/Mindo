"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import type { Wuxing } from "@mindo/core";

const ELEMENT_EMOJIS: Record<Wuxing, string> = {
  Wood: '🌲', Fire: '🔥', Earth: '⛰️', Metal: '⚔️', Water: '💧'
};

const ELEMENT_COLORS: Record<Wuxing, { fill: string; stroke: string; shadow: string }> = {
  Wood: { fill: 'fill-emerald-500/20', stroke: 'stroke-emerald-500', shadow: 'rgba(16, 185, 129, 0.4)' },
  Fire: { fill: 'fill-rose-500/20', stroke: 'stroke-rose-500', shadow: 'rgba(225, 29, 72, 0.4)' },
  Earth: { fill: 'fill-amber-500/20', stroke: 'stroke-amber-500', shadow: 'rgba(245, 158, 11, 0.4)' },
  Metal: { fill: 'fill-slate-500/20', stroke: 'stroke-slate-500', shadow: 'rgba(148, 163, 184, 0.4)' },
  Water: { fill: 'fill-blue-500/20', stroke: 'stroke-blue-500', shadow: 'rgba(59, 130, 246, 0.4)' }
};

interface EnergyRadarProps {
  energyData: Record<Wuxing, number>;
  dayMasterElement: Wuxing;
}

export default function EnergyRadar({ energyData, dayMasterElement }: EnergyRadarProps) {
  const themeColors = ELEMENT_COLORS[dayMasterElement] || ELEMENT_COLORS['Wood'];
  const GRID_BOUNDARY = 90;
  const size = 400;
  const center = size / 2;
  const radius = 150;

  const rotatedElements = useMemo(() => {
    const cycle: Wuxing[] = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];
    const startIndex = cycle.indexOf(dayMasterElement);
    if (startIndex === -1) return cycle;
    return [...cycle.slice(startIndex), ...cycle.slice(0, startIndex)];
  }, [dayMasterElement]);

  const getCoordinates = (energy: number, index: number) => {
    const scale = energy / GRID_BOUNDARY;
    const angle = (Math.PI * 2 * index) / 5 - Math.PI / 2;
    return {
      x: center + radius * scale * Math.cos(angle),
      y: center + radius * scale * Math.sin(angle)
    };
  };

  const polygonPoints = rotatedElements
    .map((el, i) => {
      const { x, y } = getCoordinates(energyData[el] || 0, i);
      return `${x},${y}`;
    })
    .join(" ");

  const gridRing = rotatedElements.map((_, i) => {
    const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    return `${center + radius * Math.cos(angle)},${center + radius * Math.sin(angle)}`;
  }).join(" ");

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-visible">
      <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        <g style={{ color: 'hsl(var(--foreground) / 0.2)' }}>
          <polygon points={gridRing} fill="none" stroke="currentColor" strokeWidth="2" />
          {rotatedElements.map((_, i) => {
            const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
            return (
              <line
                key={i}
                x1={center} y1={center}
                x2={center + radius * Math.cos(angle)}
                y2={center + radius * Math.sin(angle)}
                stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 2"
              />
            );
          })}
        </g>

        <motion.polygon
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          points={polygonPoints}
          className={`${themeColors.fill} ${themeColors.stroke} stroke-[4] transition-colors duration-700`}
          style={{ filter: `drop-shadow(0 0 16px ${themeColors.shadow})` }}
        />

        {rotatedElements.map((el, i) => {
          const { x, y } = getCoordinates(energyData[el] || 0, i);
          const labelX = center + radius * 1.25 * Math.cos((Math.PI * 2 * i) / 5 - Math.PI / 2);
          const labelY = center + radius * 1.25 * Math.sin((Math.PI * 2 * i) / 5 - Math.PI / 2);
          return (
            <g key={el} className="overflow-visible">
              <motion.circle
                initial={{ r: 0 }}
                animate={{ r: 4 }}
                transition={{ delay: 0.5, type: 'spring' }}
                cx={x} cy={y}
                style={{ fill: 'hsl(var(--foreground))' }}
              />
              <text x={labelX} y={labelY} textAnchor="middle" alignmentBaseline="middle" className="text-4xl">
                {ELEMENT_EMOJIS[el]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
