'use client';
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import type { StandardScores } from '@/components/divination/bigfive/BigFiveFacets';
import {
  BIGFIVE_COLORS,
  DOMAIN_ORDER,
  DOMAIN_FACETS,
  DOMAIN_LETTER,
} from '@/lib/bigfive-constants';

// ── Fixed geometry ────────────────────────────────────────────────────────────
const VB            = 440;
const CX            = 220;
const CY            = 220;
const R             = 135;           // radar outer radius
const RI            = 75;            // rose inner radius
const RO            = 150;           // rose outer radius
const R_LABEL_OUTER = RO + 38;       // = 188, positions 0,2,4 within domain (1st,3rd,5th)
const R_LABEL_INNER = RO + 18;       // = 168, positions 1,3,5 within domain (2nd,4th,6th)
const STEP          = (2 * Math.PI) / 5;
const FSTEP         = (2 * Math.PI) / 30;
const GRIDS         = [0.25, 0.5, 0.75, 1.0];
// O centered at top: shift start so O's 6 facets are symmetric around -π/2
const ROSE_START    = -Math.PI / 2 - Math.PI / 5;

function pt(r: number, a: number) {
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
}

function donutPath(r1: number, r2: number, a1: number, a2: number): string {
  const p1 = pt(r1, a1), p2 = pt(r2, a1), p3 = pt(r2, a2), p4 = pt(r1, a2);
  const lg = a2 - a1 > Math.PI ? 1 : 0;
  return (
    `M${p1.x},${p1.y} L${p2.x},${p2.y}` +
    ` A${r2},${r2},0,${lg},1,${p3.x},${p3.y}` +
    ` L${p4.x},${p4.y}` +
    ` A${r1},${r1},0,${lg},0,${p1.x},${p1.y}Z`
  );
}

function piePath(r: number, a1: number, a2: number): string {
  const p1 = pt(r, a1), p2 = pt(r, a2);
  const lg = a2 - a1 > Math.PI ? 1 : 0;
  return `M${CX},${CY} L${p1.x},${p1.y} A${r},${r},0,${lg},1,${p2.x},${p2.y}Z`;
}

function tScale(t: number): number {
  return Math.max(0, Math.min(1, (t - 20) / 60));
}

// ── Component ─────────────────────────────────────────────────────────────────

interface BigFiveChartProps {
  standardScores: StandardScores;
}

export default function BigFiveChart({ standardScores }: BigFiveChartProps) {
  const [flipped, setFlipped] = useState(false);
  const tDomains = useTranslations('bigfive.domains');
  const t = useTranslations('bigfive');

  // ── Radar data ──────────────────────────────────────────────────────────────
  const radarPoints = useMemo(() =>
    DOMAIN_ORDER.map((domain, i) => {
      const angle = -Math.PI / 2 + STEP * i;
      const entry = standardScores.domains[domain];
      const scale = entry ? tScale(entry.t) : 0;
      const { x: lx, y: ly } = pt(R + 18, angle);
      return {
        domain, angle, color: BIGFIVE_COLORS[domain],
        letter: DOMAIN_LETTER[domain],
        x: CX + R * scale * Math.cos(angle),
        y: CY + R * scale * Math.sin(angle),
        lx, ly,
      };
    })
  , [standardScores.domains]);

  const radarPolygon = radarPoints.map(p => `${p.x},${p.y}`).join(' ');

  // ── Rose data ───────────────────────────────────────────────────────────────
  type RoseSector = {
    path: string; color: string; key: string;
    domain: string; facet: string; midAngle: number; segR: number;
  };

  const roseSectors = useMemo((): RoseSector[] => {
    const out: RoseSector[] = [];
    DOMAIN_ORDER.forEach((domain, di) => {
      const color = BIGFIVE_COLORS[domain];
      DOMAIN_FACETS[domain].forEach((facet, fi) => {
        const idx = di * 6 + fi;
        const a1  = ROSE_START + FSTEP * idx;
        const a2  = a1 + FSTEP;
        const mid = a1 + FSTEP / 2;
        const entry = standardScores.facets[facet];
        const segR = entry ? RI + tScale(entry.t) * (RO - RI) : RI + 1;
        out.push({ path: donutPath(RI, segR, a1, a2), color, domain, facet, midAngle: mid, segR, key: `${domain}-${facet}` });
      });
    });
    return out;
  }, [standardScores.facets]);

  // Inner pie: O centered at top, mid aligned with radar axes
  const innerPies = useMemo(() =>
    DOMAIN_ORDER.map((domain, di) => {
      const a1  = ROSE_START + STEP * di;
      const mid = -Math.PI / 2 + STEP * di;
      const { x: lx, y: ly } = pt(RI * 0.58, mid);
      return {
        domain, letter: DOMAIN_LETTER[domain],
        color: BIGFIVE_COLORS[domain],
        path: piePath(RI, a1, a1 + STEP),
        lx, ly,
      };
    })
  , []);

  // ── SVG: Radar (front) ──────────────────────────────────────────────────────
  const svgRadar = (
    <svg viewBox={`0 0 ${VB} ${VB}`} width="100%" height="100%"
      style={{ display: 'block', overflow: 'visible' }}>
      <g>
        {GRIDS.map(scale => (
          <polygon key={scale}
            points={radarPoints.map(p => { const { x, y } = pt(R * scale, p.angle); return `${x},${y}`; }).join(' ')}
            fill="none" stroke="hsl(var(--border))" strokeWidth={0.5}
          />
        ))}
        {radarPoints.map(p => {
          const { x, y } = pt(R, p.angle);
          return <line key={p.domain} x1={CX} y1={CY} x2={x} y2={y}
            stroke="hsl(var(--border))" strokeWidth={0.5} />;
        })}
        <polygon points={radarPolygon}
          fill="rgba(128,128,128,0.1)"
          stroke={BIGFIVE_COLORS.NEUROTICISM} strokeWidth={1.5} />
        {radarPoints.map(p => (
          <circle key={p.domain} cx={p.x} cy={p.y} r={5} fill={p.color} />
        ))}
        {radarPoints.map(p => (
          <text key={p.domain} x={p.lx} y={p.ly}
            textAnchor="middle" dominantBaseline="middle" fontSize={11} fill={p.color}>
            {tDomains(p.letter as Parameters<typeof tDomains>[0])}
          </text>
        ))}
      </g>
    </svg>
  );

  // ── SVG: Rose (back) ────────────────────────────────────────────────────────
  const svgRose = (
    <svg viewBox={`0 0 ${VB} ${VB}`} width="100%" height="100%"
      style={{ display: 'block', overflow: 'visible' }}>
      <g>
        {/* Per-domain groups: outer donut sectors + inner pie */}
        {DOMAIN_ORDER.map((domain, di) => {
          const innerPie      = innerPies[di];
          const domainSectors = roseSectors.filter(s => s.domain === domain);

          return (
            <g key={domain}>
              {domainSectors.map(s => (
                <path key={s.key} d={s.path} fill={s.color}
                  stroke="hsl(var(--background))" strokeWidth={1.5} />
              ))}
              <path d={innerPie.path} fill={innerPie.color} fillOpacity={0.9}
                stroke="hsl(var(--background))" strokeWidth={1.5} />
              <text x={innerPie.lx} y={innerPie.ly}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={8} fontWeight={500} fill="white"
                style={{ pointerEvents: 'none' }}>
                {tDomains(innerPie.letter as Parameters<typeof tDomains>[0])}
              </text>
            </g>
          );
        })}

        {/* All 30 facet labels — alternating outer/inner rings to reduce overlap */}
        {roseSectors.map((s, i) => {
          const posInDomain = i % 6;
          const labelR = posInDomain % 2 === 0 ? R_LABEL_OUTER : R_LABEL_INNER;
          const mid    = s.midAngle;
          const linePt = pt(s.segR, mid);
          const ringPt = pt(labelR, mid);
          const textPt = pt(labelR + 4, mid);
          const c      = Math.cos(mid);
          const anchor = c > 0.2 ? 'start' : c < -0.2 ? 'end' : 'middle';
          return (
            <g key={`label-${s.key}`}>
              <line
                x1={linePt.x} y1={linePt.y}
                x2={ringPt.x} y2={ringPt.y}
                stroke={s.color} strokeWidth={0.8} strokeOpacity={0.4}
              />
              <text
                x={textPt.x} y={textPt.y}
                textAnchor={anchor} dominantBaseline="middle"
                fontSize={9} fill={s.color}
              >
                {t(`facets.${s.facet}` as Parameters<typeof t>[0])}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      className="p-6 rounded-3xl"
      style={{
        cursor: 'pointer',
        userSelect: 'none',
        background: 'hsl(var(--card))',
        border: '1px solid hsl(var(--border))',
        width: '100%',
        perspective: '1000px',
      }}
      onClick={() => setFlipped(f => !f)}
    >
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        style={{ transformStyle: 'preserve-3d', position: 'relative' }}
      >
        {/* Front: Radar */}
        <div style={{ backfaceVisibility: 'hidden' }}>
          {svgRadar}
        </div>
        {/* Back: Rose */}
        <div style={{
          backfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)',
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
        }}>
          {svgRose}
        </div>
      </motion.div>
    </div>
  );
}
