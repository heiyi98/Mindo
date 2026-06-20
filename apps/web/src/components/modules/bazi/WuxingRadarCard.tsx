'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { Wuxing } from '@mindo/core';

const ELEMENT_COLORS: Record<string, string> = {
  Wood:  '#388E3C', Fire:  '#D32F2F', Earth: '#F57F17',
  Metal: '#757575', Water: '#1976D2', gray:  '#6b7280',
};

const WUXING_LABELS: Record<string, string> = {
  Wood: '木', Fire: '火', Earth: '土', Metal: '金', Water: '水',
};

const WUXING_ORDER: Wuxing[] = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];

const WUXING_SHENG: Record<string, Wuxing> = { Wood: 'Fire', Fire: 'Earth', Earth: 'Metal', Metal: 'Water', Water: 'Wood' };
const WUXING_KE: Record<string, Wuxing> = { Wood: 'Earth', Earth: 'Water', Water: 'Fire', Fire: 'Metal', Metal: 'Wood' };
const WUXING_KE_ME: Record<string, Wuxing> = { Wood: 'Metal', Fire: 'Water', Earth: 'Wood', Metal: 'Fire', Water: 'Earth' };
const WUXING_SHENG_ME: Record<string, Wuxing> = { Wood: 'Water', Fire: 'Wood', Earth: 'Fire', Metal: 'Earth', Water: 'Metal' };

const SHISHEN_LABELS: Record<string, string> = {
  BiJian: '比肩', JieCai: '劫财', ShiShen: '食神', ShangGuan: '伤官',
  PianCai: '偏财', ZhengCai: '正财', QiSha: '七杀', ZhengGuan: '正官',
  PianYin: '偏印', ZhengYin: '正印',
};

const ALL_SHISHEN = [
  'BiJian','JieCai','ShiShen','ShangGuan',
  'PianCai','ZhengCai','QiSha','ZhengGuan',
  'PianYin','ZhengYin',
];

function getShishenWuxing(shishen: string, dayMasterElement: Wuxing): Wuxing {
  switch (shishen) {
    case 'BiJian': case 'JieCai':   return dayMasterElement;
    case 'ShiShen': case 'ShangGuan': return WUXING_SHENG[dayMasterElement] ?? dayMasterElement;
    case 'PianCai': case 'ZhengCai':  return WUXING_KE[dayMasterElement]   ?? dayMasterElement;
    case 'QiSha': case 'ZhengGuan':   return WUXING_KE_ME[dayMasterElement] ?? dayMasterElement;
    case 'PianYin': case 'ZhengYin':  return WUXING_SHENG_ME[dayMasterElement] ?? dayMasterElement;
    default: return dayMasterElement;
  }
}

function RadarFace({ energyData, dayMasterElement }: { energyData: Record<Wuxing, number>; dayMasterElement: Wuxing; }) {
  const maxVal = Math.max(...WUXING_ORDER.map(k => energyData[k] ?? 0), 1);
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.36;

  const dayIdx = WUXING_ORDER.indexOf(dayMasterElement);
  const orderedWuxing = WUXING_ORDER.slice(dayIdx).concat(WUXING_ORDER.slice(0, dayIdx));

  const points = orderedWuxing.map((key, i) => {
    const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    const ratio = Math.min((energyData[key] ?? 0) / maxVal, 1);
    const r = maxR * 0.15 + maxR * 0.85 * ratio;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle), key, angle };
  });

  const bgPoints = orderedWuxing.map((_, i) => {
    const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    return { x: cx + maxR * Math.cos(angle), y: cy + maxR * Math.sin(angle) };
  });

  const toPath = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ') + ' Z';

  const accentColor = ELEMENT_COLORS[dayMasterElement] ?? ELEMENT_COLORS['Water'];

  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} preserveAspectRatio="xMidYMid meet" style={{ overflow: 'visible' }}>
        {[0.33, 0.66, 1].map(scale => (
          <path key={scale} d={toPath(bgPoints.map(p => ({ x: cx + (p.x - cx) * scale, y: cy + (p.y - cy) * scale })))} fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.5" />
        ))}
        {bgPoints.map((p, i) => (
          <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.3" />
        ))}
        <path d={toPath(points)} fill={accentColor} fillOpacity="0.15" stroke={accentColor} strokeWidth="1.5" strokeOpacity="0.7" />
        {points.map(p => (
          <circle key={p.key} cx={p.x} cy={p.y} r="3" fill={ELEMENT_COLORS[p.key] ?? accentColor} opacity="0.9" />
        ))}
        {points.map(p => {
          const labelR = maxR + 18;
          const lx = cx + labelR * Math.cos(p.angle);
          const ly = cy + labelR * Math.sin(p.angle);
          return (
            <text key={p.key} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize="12" fill={ELEMENT_COLORS[p.key] ?? 'hsl(var(--muted-foreground))'} opacity="0.85">
              {WUXING_LABELS[p.key]}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function ShishenFace({ shishenInfluence, dayMasterElement, dayMasterEnergy }: { shishenInfluence: { shishen: string; totalInfluence: number }[]; dayMasterElement: Wuxing; dayMasterEnergy: number; }) {
  const influenceMap = new Map(shishenInfluence.map(s => [s.shishen, s.totalInfluence]));
  const maxVal = Math.max(...shishenInfluence.map(s => s.totalInfluence), dayMasterEnergy, 1);

  const sorted = ALL_SHISHEN.map(shishen => ({ shishen, totalInfluence: influenceMap.get(shishen) ?? 0 })).sort((a, b) => b.totalInfluence - a.totalInfluence);

  const VW = 200;
  const VH = 220;
  const PAD_X = 14;
  const PAD_Y = 10;
  const TOTAL_ROWS = 11;
  const ROW_H = (VH - PAD_Y * 2) / TOTAL_ROWS;
  const LABEL_W = 36;
  const BAR_X = PAD_X + LABEL_W + 6;
  const BAR_W = VW - BAR_X - PAD_X;
  const BAR_H = 4;
  const BAR_R = 2;

  const allRows = [
    { key: 'DayMaster', label: '日主', color: ELEMENT_COLORS[dayMasterElement] ?? ELEMENT_COLORS['gray'], pct: dayMasterEnergy / maxVal, isDay: true },
    ...sorted.map(({ shishen, totalInfluence }) => ({ key: shishen, label: SHISHEN_LABELS[shishen] ?? shishen, color: ELEMENT_COLORS[getShishenWuxing(shishen, dayMasterElement)] ?? ELEMENT_COLORS['gray'], pct: totalInfluence / maxVal, isDay: false })),
  ];

  return (
    <div className="w-full h-full flex items-center justify-center p-2">
      <svg width="100%" height="100%" viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }}>
        {allRows.map(({ key, label, color, pct, isDay }, i) => {
          const cy = PAD_Y + ROW_H * i + ROW_H / 2;
          return (
            <g key={key}>
              <text x={PAD_X + LABEL_W} y={cy} textAnchor="end" dominantBaseline="middle" fontSize="11" fontWeight={isDay ? '400' : '300'} fill={isDay ? color : 'hsl(var(--muted-foreground))'}>{label}</text>
              <rect x={BAR_X} y={cy - BAR_H / 2} width={BAR_W} height={BAR_H} rx={BAR_R} fill="hsl(var(--border))" />
              {pct > 0 && (
                <rect x={BAR_X} y={cy - BAR_H / 2} width={BAR_W * pct} height={BAR_H} rx={BAR_R} fill={color} opacity={isDay ? 1 : 0.85}>
                  <animate attributeName="width" from="0" to={BAR_W * pct} dur="0.5s" fill="freeze" calcMode="spline" keySplines="0.4 0 0.2 1" keyTimes="0;1" />
                </rect>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export const COLS = 2;
export const ROWS = 2;
export const CARD_META = { id: 'wuxing-radar', cols: COLS, rows: ROWS, module: 'bazi' };

export default function WuxingRadarCard({ profileId }: { profileId: string }) {
  const [flipped, setFlipped] = useState(false);
  const [bazi, setBazi] = useState<any>(null);

  useEffect(() => {
    if (!profileId) return;
    fetch(`/api/dashboard?profile_id=${profileId}`)
      .then(r => r.json())
      .then(d => { if (d.bazi) setBazi(d.bazi); })
      .catch(() => {});
  }, [profileId]);

  if (!bazi) {
    return (
      <div
        className="rounded-2xl"
        style={{ width: '100%', height: '100%', background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
      />
    );
  }

  const energyData = bazi.energyScores || {};
  const dayMasterElement = (bazi.pillars?.tianGanNodes?.find((n: any) => n.pos === 'DayStem')?.wuxing as Wuxing) || 'Water';
  const shishenInfluence = bazi.influence?.shishenInfluence || [];
  const dayMasterEnergy = bazi.influence?.dayMasterEnergy || 0;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ width: '100%', height: '100%', background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
    >
      <div
        className="cursor-pointer w-full h-full"
        style={{ perspective: '1000px' }}
        onClick={() => setFlipped(f => !f)}
      >
        <motion.div
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          style={{ width: '100%', height: '100%', transformStyle: 'preserve-3d', position: 'relative' }}
        >
          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
            <RadarFace energyData={energyData} dayMasterElement={dayMasterElement} />
          </div>
          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
            <ShishenFace shishenInfluence={shishenInfluence} dayMasterElement={dayMasterElement} dayMasterEnergy={dayMasterEnergy} />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
