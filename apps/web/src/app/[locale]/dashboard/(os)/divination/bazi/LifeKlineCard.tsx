'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import {
  ComposedChart, Line, XAxis, YAxis, Tooltip,
} from 'recharts';
import type { YearScore } from '@mindo/core';
import type { Wuxing } from '@mindo/core';

// ── Lookup tables ──────────────────────────────────────────

const TIANGAN_ZH: Record<string, string> = {
  Jia: '甲', Yi: '乙', Bing: '丙', Ding: '丁', Wu: '戊',
  Ji: '己', Geng: '庚', Xin: '辛', Ren: '壬', Gui: '癸',
};
const DIZHI_ZH: Record<string, string> = {
  Zi: '子', Chou: '丑', Yin: '寅', Mao: '卯', Chen: '辰', Si: '巳',
  Wu: '午', Wei: '未', Shen: '申', You: '酉', Xu: '戌', Hai: '亥',
};

const ELEMENT_COLORS: Record<string, string> = {
  Wood: '#388E3C', Fire: '#D32F2F', Earth: '#F57F17', Metal: '#757575', Water: '#1976D2',
};
const WUXING_SHENG: Record<string, string> = {
  Wood: 'Fire', Fire: 'Earth', Earth: 'Metal', Metal: 'Water', Water: 'Wood',
};
const WUXING_KE: Record<string, string> = {
  Wood: 'Earth', Earth: 'Water', Water: 'Fire', Fire: 'Metal', Metal: 'Wood',
};
const WUXING_KE_ME: Record<string, string> = {
  Wood: 'Metal', Fire: 'Water', Earth: 'Wood', Metal: 'Fire', Water: 'Earth',
};
const WUXING_SHENG_ME: Record<string, string> = {
  Wood: 'Water', Fire: 'Wood', Earth: 'Fire', Metal: 'Earth', Water: 'Metal',
};

// ── Types ──────────────────────────────────────────────────

// 模式：大运 | 大运流年
type PrecisionMode = 'dayun' | 'liuyear';

export interface LifeTimelineData {
  baseline: number;
  years: YearScore[];
}

interface ChartEntry {
  year: number;
  age: number;
  dayunStem: string;
  dayunBranch: string;
  liuyearStem: string;
  liuyearBranch: string;
  // 失衡值保留在数据里，注释未完成（K线功能待恢复）
  imbalance: number;
  bijie: number;
  shishang: number;
  caixin: number;
  guansha: number;
  yinxing: number;
}

interface DayunGroup {
  startIndex: number;
  endIndex: number;
  stem: string;
  branch: string;
  index: number;
}

type EnergyKey = 'bijie' | 'shishang' | 'caixin' | 'guansha' | 'yinxing';
const ENERGY_KEYS: EnergyKey[] = ['bijie', 'shishang', 'caixin', 'guansha', 'yinxing'];

const CHART_HEIGHT = 300;
const CHART_MARGIN = { top: 10, right: 12, bottom: 32, left: 12 };
const MIN_PX_PER_POINT_YEAR = 20;
const MIN_PX_PER_POINT_DAYUN = 80;

// ── Data builders ──────────────────────────────────────────

function buildYearChartData(years: YearScore[]): ChartEntry[] {
  return years.map(y => ({
    year: y.year,
    age: y.age,
    dayunStem: y.dayunStem,
    dayunBranch: y.dayunBranch,
    liuyearStem: y.liuyearStem,
    liuyearBranch: y.liuyearBranch,
    imbalance: y.imbalance,
    bijie: y.energies.bijie,
    shishang: y.energies.shishang,
    caixin: y.energies.caixin,
    guansha: y.energies.guansha,
    yinxing: y.energies.yinxing,
  }));
}

function buildDayunChartData(years: YearScore[]): ChartEntry[] {
  const seen = new Set<string>();
  const result: ChartEntry[] = [];
  for (const y of years) {
    const key = `${y.dayunStem}${y.dayunBranch}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push({
        year: y.year,
        age: y.age,
        dayunStem: y.dayunStem,
        dayunBranch: y.dayunBranch,
        liuyearStem: '',
        liuyearBranch: '',
        imbalance: y.imbalance,
        bijie: y.energies.bijie,
        shishang: y.energies.shishang,
        caixin: y.energies.caixin,
        guansha: y.energies.guansha,
        yinxing: y.energies.yinxing,
      });
    }
  }
  return result;
}

function buildDayunGroups(data: ChartEntry[]): DayunGroup[] {
  const groups: DayunGroup[] = [];
  let cur: DayunGroup | null = null;
  for (let i = 0; i < data.length; i++) {
    const d = data[i];
    const key = `${d.dayunStem}${d.dayunBranch}`;
    if (!cur || `${cur.stem}${cur.branch}` !== key) {
      if (cur) groups.push(cur);
      cur = { startIndex: i, endIndex: i, stem: d.dayunStem, branch: d.dayunBranch, index: groups.length };
    } else {
      cur.endIndex = i;
    }
  }
  if (cur) groups.push(cur);
  return groups;
}

// ── Thumbnail: 五条能量折线缩略图 ─────────────────────────

function ThumbnailChart({ years }: { years: YearScore[] }) {
  if (years.length === 0) return null;

  // 只显示当前年前后5年，共10年
  const currentYear = new Date().getFullYear();
  const centerIdx = years.findIndex(y => y.year >= currentYear);
  const ci = centerIdx < 0 ? years.length - 1 : centerIdx;
  const start = Math.max(0, ci - 5);
  const end = Math.min(years.length, start + 10);
  const slice = years.slice(start, end);

  const VW = 500; const VH = 100;
  const PAD_X = 8; const PAD_Y = 10;
  const drawH = VH - PAD_Y * 2;
  const drawW = VW - PAD_X * 2;
  const n = slice.length;
  if (n === 0) return null;

  // 全局最大值归一化
  const allE = slice.flatMap(y => [
    y.energies.bijie, y.energies.shishang, y.energies.caixin,
    y.energies.guansha, y.energies.yinxing,
  ]);
  const maxE = Math.max(...allE, 1);

  const toX = (i: number) => PAD_X + (i + 0.5) * (drawW / n);
  const toY = (v: number) => PAD_Y + drawH * (1 - v / maxE);

  const keys: EnergyKey[] = ['bijie', 'shishang', 'caixin', 'guansha', 'yinxing'];

  return (
    <svg width="100%" viewBox={`0 0 ${VW} ${VH}`}
      preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }}>
      {keys.map(key => {
        const pts = slice.map((y, i) =>
          `${toX(i).toFixed(1)},${toY(y.energies[key as keyof typeof y.energies] as number).toFixed(1)}`
        ).join(' ');
        const color = key === 'bijie' ? '#1976D2'
          : key === 'shishang' ? '#388E3C'
          : key === 'caixin' ? '#D32F2F'
          : key === 'guansha' ? '#F57F17'
          : '#757575';
        return (
          <polyline key={key} points={pts}
            fill="none" stroke={color} strokeWidth={1.2} opacity={0.7} />
        );
      })}
    </svg>
  );
}

// ── 大运背景SVG层 ─────────────────────────────────────────

function DayunBgLayer({
  data, width, height, marginLeft, marginRight, marginTop, marginBottom,
}: {
  data: ChartEntry[];
  width: number; height: number;
  marginLeft: number; marginRight: number;
  marginTop: number; marginBottom: number;
}) {
  const drawW = width - marginLeft - marginRight;
  const drawH = height - marginTop - marginBottom;
  const n = data.length;
  const colW = drawW / n;
  const groups = buildDayunGroups(data);

  return (
    <svg style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
      width={width} height={height}>
      {groups.map((g, i) => {
        const x1 = marginLeft + g.startIndex * colW;
        const x2 = marginLeft + (g.endIndex + 1) * colW;
        const label = `${TIANGAN_ZH[g.stem] ?? g.stem}${DIZHI_ZH[g.branch] ?? g.branch}`;
        return (
          <g key={`${g.stem}${g.branch}${g.startIndex}`}>
            <rect x={x1} y={marginTop} width={x2 - x1} height={drawH}
              fill={i % 2 === 0 ? 'hsl(var(--muted) / 0.15)' : 'transparent'} />
            <text x={(x1 + x2) / 2} y={marginTop + drawH + 14}
              textAnchor="middle" fontSize={9}
              fill="hsl(var(--muted-foreground))" opacity={0.5}>
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Modal ──────────────────────────────────────────────────

function LifeKlineModal({
  lifeTimeline, dayMasterElement, onClose,
}: {
  lifeTimeline: LifeTimelineData;
  dayMasterElement: Wuxing;
  onClose: () => void;
}) {
  const t = useTranslations('bazi');
  const [mode, setMode] = useState<PrecisionMode>('liuyear');
  const [visible, setVisible] = useState<Record<EnergyKey, boolean>>({
    bijie: true, shishang: true, caixin: true, guansha: true, yinxing: true,
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => { if (el.offsetWidth > 0) setViewportWidth(el.offsetWidth); };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const activeData = useMemo(() =>
    mode === 'dayun'
      ? buildDayunChartData(lifeTimeline.years)
      : buildYearChartData(lifeTimeline.years),
    [mode, lifeTimeline.years]
  );

  const n = activeData.length;
  const minPx = mode === 'dayun' ? MIN_PX_PER_POINT_DAYUN : MIN_PX_PER_POINT_YEAR;
  const chartWidth = Math.max(viewportWidth || 800, n * minPx);

  // 能量Y轴范围：全局最大值
  const maxE = useMemo(() => {
    const allE = activeData.flatMap(d => [d.bijie, d.shishang, d.caixin, d.guansha, d.yinxing]);
    return Math.max(...allE, 1) * 1.1;
  }, [activeData]);

  // 自动滚动到当前年
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || viewportWidth === 0 || n === 0) return;
    const currentYear = new Date().getFullYear();
    const idx = activeData.findIndex(d => d.year >= currentYear);
    if (idx < 0) return;
    const colW = chartWidth / n;
    el.scrollLeft = Math.max(0, idx * colW - viewportWidth / 2);
  }, [mode, viewportWidth, chartWidth, activeData, n]);

  const lineColors: Record<EnergyKey, string> = {
    bijie:    ELEMENT_COLORS[dayMasterElement] ?? '#6b7280',
    shishang: ELEMENT_COLORS[WUXING_SHENG[dayMasterElement] ?? ''] ?? '#6b7280',
    caixin:   ELEMENT_COLORS[WUXING_KE[dayMasterElement] ?? ''] ?? '#6b7280',
    guansha:  ELEMENT_COLORS[WUXING_KE_ME[dayMasterElement] ?? ''] ?? '#6b7280',
    yinxing:  ELEMENT_COLORS[WUXING_SHENG_ME[dayMasterElement] ?? ''] ?? '#6b7280',
  };

  const keyLabels: Record<EnergyKey, string> = {
    bijie: t('kline.bijie'), shishang: t('kline.shishang'),
    caixin: t('kline.caixin'), guansha: t('kline.guansha'), yinxing: t('kline.yinxing'),
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'hsl(var(--background) / 0.75)',
        backdropFilter: 'blur(12px)', padding: '20px',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.97 }}
        transition={{ duration: 0.2 }}
        style={{
          width: '100%', maxWidth: 900,
          background: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
          borderRadius: 20, padding: '18px 16px 14px',
          maxHeight: '88vh',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', marginBottom: 14, gap: 8,
        }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'hsl(var(--foreground))', flexShrink: 0 }}>
            {t('klineTitle')}
          </span>

          {/* 模式切换：大运 | 大运流年 */}
          <div style={{
            display: 'flex', gap: 2,
            background: 'hsl(var(--muted) / 0.5)',
            borderRadius: 9, padding: 3,
          }}>
            {(['dayun', 'liuyear'] as PrecisionMode[]).map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                fontSize: 11,
                fontWeight: mode === m ? 500 : 400,
                color: mode === m ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
                background: mode === m ? 'hsl(var(--card))' : 'transparent',
                border: 'none', cursor: 'pointer',
                padding: '3px 10px', borderRadius: 6,
                transition: 'all 0.15s',
                boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                whiteSpace: 'nowrap',
              }}>
                {m === 'dayun' ? t('kline.modeDayun') : t('kline.modeYear')}
              </button>
            ))}
          </div>

          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'hsl(var(--muted-foreground))', display: 'flex', padding: 4, flexShrink: 0,
          }}>
            <X size={16} />
          </button>
        </div>

        {/* 横向滚动图表 */}
        <div ref={scrollRef} style={{ overflowX: 'auto', overflowY: 'hidden', width: '100%' }}>
          <div style={{ position: 'relative', width: chartWidth, height: CHART_HEIGHT }}>

            {/* 大运背景SVG层（在recharts下方） */}
            {viewportWidth > 0 && (
              <DayunBgLayer
                data={activeData}
                width={chartWidth} height={CHART_HEIGHT}
                marginLeft={CHART_MARGIN.left} marginRight={CHART_MARGIN.right}
                marginTop={CHART_MARGIN.top} marginBottom={CHART_MARGIN.bottom}
              />
            )}

            {/* recharts折线层 */}
            <div style={{ position: 'relative', zIndex: 1 }}>
              <ComposedChart
                width={chartWidth} height={CHART_HEIGHT}
                data={activeData} margin={CHART_MARGIN}
              >
                <XAxis
                  dataKey="year" type="category" interval={0}
                  tickFormatter={(v: unknown) => String(v).slice(-2)}
                  tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickLine={false}
                />
                <YAxis yAxisId="energy" domain={[0, maxE]} hide />

                {ENERGY_KEYS.filter(k => visible[k]).map(key => (
                  <Line
                    key={key}
                    yAxisId="energy"
                    dataKey={key}
                    type="monotone"
                    stroke={lineColors[key]}
                    strokeWidth={1.5}
                    dot={false}
                    activeDot={{ r: 3 }}
                    strokeOpacity={0.8}
                    isAnimationActive={false}
                  />
                ))}

                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <Tooltip content={(props: any) => {
                  if (!props.active || !props.payload?.[0]?.payload) return null;
                  const d = props.payload[0].payload as ChartEntry;
                  const dy = `${TIANGAN_ZH[d.dayunStem] ?? d.dayunStem}${DIZHI_ZH[d.dayunBranch] ?? d.dayunBranch}大运`;
                  const ly = (mode === 'liuyear' && d.liuyearStem)
                    ? ` · ${TIANGAN_ZH[d.liuyearStem] ?? d.liuyearStem}${DIZHI_ZH[d.liuyearBranch] ?? d.liuyearBranch}流年`
                    : '';
                  return (
                    <div style={{
                      background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))',
                      borderRadius: 10, padding: '10px 14px', fontSize: 12,
                      color: 'hsl(var(--foreground))', minWidth: 160,
                      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                    }}>
                      <div style={{ fontWeight: 500, marginBottom: 4 }}>{d.year} · {d.age}岁</div>
                      <div style={{ opacity: 0.5, fontSize: 11, marginBottom: 8 }}>{dy}{ly}</div>
                      {ENERGY_KEYS.map(k => (
                        <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          <span style={{ width: 8, height: 8, borderRadius: 2, background: lineColors[k], flexShrink: 0, display: 'inline-block' }} />
                          <span style={{ opacity: 0.6, fontSize: 11 }}>{keyLabels[k]}</span>
                          <span style={{ marginLeft: 'auto', fontSize: 11 }}>{(d[k] as number).toFixed(1)}</span>
                        </div>
                      ))}
                    </div>
                  );
                }}
                  cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
                />
              </ComposedChart>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', paddingTop: 10 }}>
          {ENERGY_KEYS.map(key => (
            <button key={key}
              onClick={() => setVisible(v => ({ ...v, [key]: !v[key] }))}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                fontSize: 11, color: 'hsl(var(--foreground))',
                opacity: visible[key] ? 1 : 0.3,
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '2px 8px', borderRadius: 6, transition: 'opacity 0.15s',
              }}>
              <span style={{
                width: 10, height: 10, borderRadius: 2,
                background: lineColors[key], flexShrink: 0, display: 'inline-block',
              }} />
              {keyLabels[key]}
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── LifeKlineCard (exported) ───────────────────────────────

export function LifeKlineCard({
  lifeTimeline, dayMasterElement,
}: {
  lifeTimeline: LifeTimelineData | null | undefined;
  dayMasterElement: Wuxing;
}) {
  const [modalOpen, setModalOpen] = useState(false);

  if (!lifeTimeline || lifeTimeline.years.length === 0) {
    return (
      <div className="rounded-2xl" style={{
        background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))',
        minHeight: 80,
      }} />
    );
  }

  return (
    <>
      <motion.div
        whileHover={{ scale: 1.01 }}
        transition={{ duration: 0.15 }}
        onClick={() => setModalOpen(true)}
        className="rounded-2xl cursor-pointer overflow-hidden"
        style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
      >
        <ThumbnailChart years={lifeTimeline.years} />
      </motion.div>

      <AnimatePresence>
        {modalOpen && (
          <LifeKlineModal
            lifeTimeline={lifeTimeline}
            dayMasterElement={dayMasterElement}
            onClose={() => setModalOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}