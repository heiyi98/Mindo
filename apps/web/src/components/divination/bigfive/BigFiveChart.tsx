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

// ── 终极分形黄金参数：底座 = 55，大环边距 = 55，小环边距 = 55 * 0.618 ──────────
const VB            = 540;           // 画布收缩至 540，安全且紧凑
const CX            = 270;
const CY            = 270;
const R             = 110;           // 雷达图背景网格半径 (边界 = 65分)
const RO            = 123;           // 玫瑰图最外围极限半径
const RI            = 55;            // 玫瑰图内圈基底半径

const X             = 55;            // 边距基准常数
const R_LABEL_INNER = RO + Math.round(X * 0.618); // 小环半径 = 157
const R_LABEL_OUTER = RO + X;                     // 大环半径 = 178

const STEP          = (2 * Math.PI) / 5;
const FSTEP         = (2 * Math.PI) / 30;

// 💡 雷达图网格：15分一级 (20-65区间，跨度45)。即 35(1/3), 50(2/3), 65(1.0)
const GRIDS         = [1/3, 2/3, 1.0]; 
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

// 玫瑰图子维度映射保持不变（20底线确立花瓣张力）
function tScale(t: number): number {
  return Math.max(0, Math.min(1, (t - 20) / 60));
}

// 雷达图截断基线映射：圆心 20，边界 65 (有效跨度 45)
function tScaleRadar(t: number): number {
  return Math.max(0, (t - 20) / 45);
}

// ── Component ─────────────────────────────────────────────────────────────────

interface BigFiveChartProps {
  standardScores: StandardScores;
}

export default function BigFiveChart({ standardScores }: BigFiveChartProps) {
  const [flipped, setFlipped] = useState(false);
  const tChartDomains = useTranslations('bigfive.chart_domains');
  const t = useTranslations('bigfive');

  // ── Radar data ──────────────────────────────────────────────────────────────
  const radarPoints = useMemo(() =>
    DOMAIN_ORDER.map((domain, i) => {
      const angle = -Math.PI / 2 + STEP * i;
      const entry = standardScores.domains[domain];
      const scale = entry ? tScaleRadar(entry.t) : 0;
      // 为放大的字体留出更多空间 (R + 28)
      const { x: lx, y: ly } = pt(R + 28, angle);
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

  // Inner pie
  const innerPies = useMemo(() =>
    DOMAIN_ORDER.map((domain, di) => {
      const a1  = ROSE_START + STEP * di;
      const mid = -Math.PI / 2 + STEP * di;
      const { x: lx, y: ly } = pt(RI * 0.62, mid);
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
        {/* 强化网格质感：内层网格稍淡，最外层边界(1.0)加粗加深，形成绝对的实体墙 */}
        {GRIDS.map(scale => {
          const isBoundary = scale === 1.0;
          return (
            <polygon key={scale}
              points={radarPoints.map(p => { const { x, y } = pt(R * scale, p.angle); return `${x},${y}`; }).join(' ')}
              fill="none" 
              stroke="hsl(var(--foreground))" 
              strokeWidth={isBoundary ? 1.5 : 1} 
              strokeOpacity={isBoundary ? 0.4 : 0.2}
            />
          );
        })}
        {radarPoints.map(p => {
          const { x, y } = pt(R, p.angle);
          return <line key={p.domain} x1={CX} y1={CY} x2={x} y2={y}
            stroke="hsl(var(--foreground))" strokeWidth={1} strokeOpacity={0.2} />;
        })}
        
        {/* 雷达图数据连线 */}
        <polygon points={radarPolygon}
          fill="rgba(128,128,128,0.12)"
          stroke="hsl(var(--foreground))" strokeWidth={2} />
        {radarPoints.map(p => (
          <circle key={p.domain} cx={p.x} cy={p.y} r={5} fill={p.color} />
        ))}
        
        {/* 雷达图文字：继承系统字体，字重设为 300 贴合胶囊，去除黑体 */}
        {radarPoints.map(p => (
          <text key={p.domain} x={p.lx} y={p.ly}
            textAnchor="middle" dominantBaseline="middle" 
            fontFamily="inherit" fontWeight={300} fontSize={13} fill={p.color}>
            {tChartDomains(p.letter as Parameters<typeof tChartDomains>[0])}
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
                fontFamily="inherit" fontWeight={300} fontSize={9} fill="white"
                style={{ pointerEvents: 'none' }}>
                {tChartDomains(innerPie.letter as Parameters<typeof tChartDomains>[0])}
              </text>
            </g>
          );
        })}

        {roseSectors.map((s, i) => {
          const posInDomain = i % 6;
          const labelR = posInDomain % 2 === 0 ? R_LABEL_OUTER : R_LABEL_INNER;
          const mid    = s.midAngle;
          const linePt = pt(s.segR, mid);
          const ringPt = pt(labelR, mid);
          const textPt = pt(labelR + 4, mid);

          const sin = Math.sin(mid);
          const cos = Math.cos(mid);
          const isTopHalf = sin < 0;

          let anchor: "start" | "middle" | "end" = "middle";
          if (sin < -0.8 || sin > 0.8) {
            anchor = 'middle'; 
          } else if (cos > 0) {
            anchor = 'start';  
          } else {
            anchor = 'end';    
          }

          const rawText = t(`facets.${s.facet}` as Parameters<typeof t>[0]);
          let lines = [rawText];
          if (rawText.includes('-')) {
            const idx = rawText.indexOf('-');
            lines = [rawText.slice(0, idx + 1), rawText.slice(idx + 1)];
          } else if (rawText.length > 10 && rawText.includes(' ')) {
            const parts = rawText.split(' ');
            lines = [parts[0], parts.slice(1).join(' ')];
          }

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
                fontFamily="inherit" fontWeight={300} fontSize={9} fill={s.color}
              >
                {lines.map((line, lIdx) => {
                  let dy = "0";
                  if (lines.length > 1) {
                    if (isTopHalf) {
                      dy = lIdx === 0 ? "-1.1em" : "1.1em"; 
                    } else {
                      dy = lIdx === 0 ? "0" : "1.1em";      
                    }
                  }
                  return (
                    <tspan key={lIdx} x={textPt.x} dy={dy}>
                      {line}
                    </tspan>
                  );
                })}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );

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
        <div style={{ backfaceVisibility: 'hidden' }}>
          {svgRadar}
        </div>
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