'use client';
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import type { StandardScores } from '@/components/modules/bigfive/BigFiveFacets';
import { BIGFIVE_COLORS, DOMAIN_ORDER, DOMAIN_FACETS, DOMAIN_LETTER } from '@/lib/bigfive-constants';

const VB = 540; const CX = 270; const CY = 270;
const R = 110; const RO = 123; const RI = 55; const X = 55;
const R_LABEL_INNER = RO + Math.round(X * 0.618); const R_LABEL_OUTER = RO + X;
const STEP = (2 * Math.PI) / 5; const FSTEP = (2 * Math.PI) / 30;
const GRIDS = [1/3, 2/3, 1.0]; const ROSE_START = -Math.PI / 2 - Math.PI / 5;

export const COLS = 2;
export const ROWS = 2;
export const CARD_META = { id: 'bigfive-radar', cols: COLS, rows: ROWS, module: 'bigfive' };

function pt(r: number, a: number) { return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) }; }
function donutPath(r1: number, r2: number, a1: number, a2: number) {
  const p1 = pt(r1, a1), p2 = pt(r2, a1), p3 = pt(r2, a2), p4 = pt(r1, a2);
  const lg = a2 - a1 > Math.PI ? 1 : 0;
  return `M${p1.x},${p1.y} L${p2.x},${p2.y} A${r2},${r2},0,${lg},1,${p3.x},${p3.y} L${p4.x},${p4.y} A${r1},${r1},0,${lg},0,${p1.x},${p1.y}Z`;
}
function piePath(r: number, a1: number, a2: number) {
  const p1 = pt(r, a1), p2 = pt(r, a2); const lg = a2 - a1 > Math.PI ? 1 : 0;
  return `M${CX},${CY} L${p1.x},${p1.y} A${r},${r},0,${lg},1,${p2.x},${p2.y}Z`;
}
function tScale(t: number) { return Math.max(0, Math.min(1, (t - 20) / 60)); }
function tScaleRadar(t: number) { return Math.max(0, (t - 20) / 45); }

export default function BigFiveChart({ profileId }: { profileId: string }) {
  const [flipped, setFlipped] = useState(false);
  const [standardScores, setStandardScores] = useState<StandardScores | null>(null);
  const tChartDomains = useTranslations('bigfive.chart_domains');
  const t = useTranslations('bigfive');

  useEffect(() => {
    if (!profileId) return;
    fetch(`/api/psychology/bigfive/result?profile_id=${profileId}`)
      .then(r => r.json())
      .then(d => { if (d.standard_scores) setStandardScores(d.standard_scores); })
      .catch(() => {});
  }, [profileId]);

  const radarPoints = useMemo(() => {
    if (!standardScores?.domains) return [];
    return DOMAIN_ORDER.map((domain, i) => {
      const angle = -Math.PI / 2 + STEP * i;
      const entry = standardScores.domains[domain];
      const scale = entry ? tScaleRadar(entry.t) : 0;
      const { x: lx, y: ly } = pt(R + 28, angle);
      return {
        domain, angle, color: BIGFIVE_COLORS[domain], letter: DOMAIN_LETTER[domain],
        x: CX + R * scale * Math.cos(angle), y: CY + R * scale * Math.sin(angle), lx, ly,
      };
    });
  }, [standardScores]);

  const radarPolygon = radarPoints.map(p => `${p.x},${p.y}`).join(' ');

  const roseSectors = useMemo(() => {
    if (!standardScores?.facets) return [];
    const out: any[] = [];
    DOMAIN_ORDER.forEach((domain, di) => {
      const color = BIGFIVE_COLORS[domain];
      DOMAIN_FACETS[domain].forEach((facet, fi) => {
        const idx = di * 6 + fi;
        const a1  = ROSE_START + FSTEP * idx; const a2  = a1 + FSTEP; const mid = a1 + FSTEP / 2;
        const entry = standardScores.facets[facet];
        const segR = entry ? RI + tScale(entry.t) * (RO - RI) : RI + 1;
        out.push({ path: donutPath(RI, segR, a1, a2), color, domain, facet, midAngle: mid, segR, key: `${domain}-${facet}` });
      });
    });
    return out;
  }, [standardScores]);

  const innerPies = useMemo(() =>
    DOMAIN_ORDER.map((domain, di) => {
      const a1  = ROSE_START + STEP * di; const mid = -Math.PI / 2 + STEP * di;
      const { x: lx, y: ly } = pt(RI * 0.62, mid);
      return { domain, letter: DOMAIN_LETTER[domain], color: BIGFIVE_COLORS[domain], path: piePath(RI, a1, a1 + STEP), lx, ly };
    })
  , []);

  if (!standardScores) return (
    <div className="w-full h-full rounded-2xl"
      style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
  );

  return (
    <div
      className="p-6 rounded-2xl shadow-sm border"
      style={{ cursor: 'pointer', userSelect: 'none', background: 'hsl(var(--card))', width: '100%', height: '100%', perspective: '1000px' }}
      onClick={() => setFlipped(f => !f)}
    >
      <motion.div animate={{ rotateY: flipped ? 180 : 0 }} transition={{ duration: 0.5, ease: 'easeInOut' }} style={{ transformStyle: 'preserve-3d', position: 'relative', width: '100%', height: '100%' }}>
        <div style={{ backfaceVisibility: 'hidden', width: '100%', height: '100%' }}>
          <svg viewBox={`0 0 ${VB} ${VB}`} width="100%" height="100%" style={{ display: 'block', overflow: 'visible' }}>
            <g>
              {GRIDS.map(scale => <polygon key={scale} points={radarPoints.map(p => `${pt(R * scale, p.angle).x},${pt(R * scale, p.angle).y}`).join(' ')} fill="none" stroke="hsl(var(--foreground))" strokeWidth={scale === 1.0 ? 1.5 : 1} strokeOpacity={scale === 1.0 ? 0.4 : 0.2} />)}
              {radarPoints.map(p => <line key={p.domain} x1={CX} y1={CY} x2={pt(R, p.angle).x} y2={pt(R, p.angle).y} stroke="hsl(var(--foreground))" strokeWidth={1} strokeOpacity={0.2} />)}
              <polygon points={radarPolygon} fill="rgba(128,128,128,0.12)" stroke="hsl(var(--foreground))" strokeWidth={2} />
              {radarPoints.map(p => <circle key={p.domain} cx={p.x} cy={p.y} r={5} fill={p.color} />)}
              {radarPoints.map(p => <text key={p.domain} x={p.lx} y={p.ly} textAnchor="middle" dominantBaseline="middle" fontFamily="inherit" fontWeight={300} fontSize={13} fill={p.color}>{tChartDomains(p.letter as any)}</text>)}
            </g>
          </svg>
        </div>
        <div style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
          <svg viewBox={`0 0 ${VB} ${VB}`} width="100%" height="100%" style={{ display: 'block', overflow: 'visible' }}>
            <g>
              {DOMAIN_ORDER.map((domain, di) => (
                <g key={domain}>
                  {roseSectors.filter(s => s.domain === domain).map(s => <path key={s.key} d={s.path} fill={s.color} stroke="hsl(var(--background))" strokeWidth={1.5} />)}
                  <path d={innerPies[di].path} fill={innerPies[di].color} fillOpacity={0.9} stroke="hsl(var(--background))" strokeWidth={1.5} />
                  <text x={innerPies[di].lx} y={innerPies[di].ly} textAnchor="middle" dominantBaseline="middle" fontFamily="inherit" fontWeight={300} fontSize={9} fill="white" style={{ pointerEvents: 'none' }}>{tChartDomains(innerPies[di].letter as any)}</text>
                </g>
              ))}
              {roseSectors.map((s, i) => {
                const labelR = (i % 6) % 2 === 0 ? R_LABEL_OUTER : R_LABEL_INNER;
                const mid = s.midAngle; const linePt = pt(s.segR, mid); const ringPt = pt(labelR, mid); const textPt = pt(labelR + 4, mid);
                let anchor: any = "middle"; if (Math.sin(mid) < -0.8 || Math.sin(mid) > 0.8) anchor = 'middle'; else if (Math.cos(mid) > 0) anchor = 'start'; else anchor = 'end';
                const rawText = t(`facets.${s.facet}` as any);
                let lines = [rawText];
                if (rawText.includes('-')) { const idx = rawText.indexOf('-'); lines = [rawText.slice(0, idx + 1), rawText.slice(idx + 1)]; } 
                else if (rawText.length > 10 && rawText.includes(' ')) { const parts = rawText.split(' '); lines = [parts[0], parts.slice(1).join(' ')]; }
                return (
                  <g key={`label-${s.key}`}>
                    <line x1={linePt.x} y1={linePt.y} x2={ringPt.x} y2={ringPt.y} stroke={s.color} strokeWidth={0.8} strokeOpacity={0.4} />
                    <text x={textPt.x} y={textPt.y} textAnchor={anchor} dominantBaseline="middle" fontFamily="inherit" fontWeight={300} fontSize={9} fill={s.color}>
                      {lines.map((line, lIdx) => <tspan key={lIdx} x={textPt.x} dy={lines.length > 1 ? (Math.sin(mid) < 0 ? (lIdx === 0 ? "-1.1em" : "1.1em") : (lIdx === 0 ? "0" : "1.1em")) : "0"}>{line}</tspan>)}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
      </motion.div>
    </div>
  );
}