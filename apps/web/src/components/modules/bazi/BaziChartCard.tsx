'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useGridContext } from '@/contexts/GridContext';

const ELEMENT_COLORS: Record<string, string> = {
  Wood: '#388E3C', Fire: '#D32F2F', Earth: '#F57F17',
  Metal: '#757575', Water: '#1976D2', gray: '#6b7280',
};

const QI_ORDER = ['BenQi', 'ZhongQi', 'YuQi'];
const POSITIONS = ['Year', 'Month', 'Day', 'Hour'] as const;
type Pos = (typeof POSITIONS)[number];

const LABEL_KEYS: Record<Pos, 'year' | 'month' | 'day' | 'hour'> = {
  Year: 'year', Month: 'month', Day: 'day', Hour: 'hour',
};

export const COLS = 4;
export const ROWS = 2;
export const CARD_META = { id: 'bazi-chart', cols: COLS, rows: ROWS, module: 'bazi' };

export default function BaziChartCard({ profileId }: { profileId: string }) {
  const t = useTranslations('bazi');
  const [bazi, setBazi] = useState<any>(null);
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<'bazi' | 'shishen'>('bazi');
  const grid = useGridContext();

  useEffect(() => {
    setBazi(null);
    if (!profileId) return;
    fetch(`/api/dashboard?profile_id=${profileId}`)
      .then(r => r.json())
      .then(d => { if (d.bazi) setBazi(d.bazi); })
      .catch(() => {});
  }, [profileId]);

  const handleCardClick = () => {
    if (expanded) {
      setExpanded(false);
      grid?.collapseCard('bazi-chart');
    } else {
      setExpanded(true);
      grid?.expandCard('bazi-chart', 2);
    }
  };

  if (!bazi) {
    return (
      <div className="rounded-2xl"
        style={{ width: '100%', height: '100%', background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
      />
    );
  }

  const pillarsData = bazi.pillars;
  const tianGanNodes: any[] = bazi.pillars?.tianGanNodes ?? [];
  const cangGanNodes: any[] = bazi.pillars?.cangGanNodes ?? [];
  const shishenMap: any[] = bazi.shishen?.shishenMap ?? [];
  const shishenById = new Map<string, string>(shishenMap.map((s: any) => [s.id, s.shishen]));

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // viewBox依据卡片自身COLS/ROWS比例
  // 命盘4列2行，正方形格子，宽高比2:1
  // 正常：500×250（2:1）
  // 展开：500×500（1:1，因为变成4行）
  // 天干地支坐标固定在0~250，展开后完全不动
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const VW = 500;
  const VH_NORMAL = 250;   // 对应2:1（4列2行）
  const VH_EXPANDED = 500; // 对应1:1（4列4行）
  const VH = expanded ? VH_EXPANDED : VH_NORMAL;
  const COL_W = VW / 4;   // 125

  // 天干区：0~125（上半）
  const LABEL_Y = 14;   // 柱名小字
  const STEM_Y = 68;    // 天干居中

  // 地支区：125~250（下半）
  const BRANCH_Y = 188; // 地支居中

  // 天干地支之间短横线：y=125
  const SHORT_LINE_HALF = 18;

  // 日干框：天干区内 y=5~120
  const DAY_COL_IDX = 2;
  const dayBoxX = COL_W * DAY_COL_IDX + 4;
  const dayBoxW = COL_W - 8;
  const dayBoxY = 5;
  const dayBoxH = 115;

  // 藏干区：250~500，均分三行，每行83单位，藏干在行中点
  const CANG_ROW_H = 250 / 3;  // ≈83.3
  const cangY = (ci: number) => 250 + CANG_ROW_H * ci + CANG_ROW_H / 2;

  const columns = POSITIONS.map((pos) => {
    const stemNode = tianGanNodes.find((n: any) => n.pos === `${pos}Stem`);
    const pillarEntry = pillarsData?.[pos.toLowerCase() as 'year' | 'month' | 'day' | 'hour'];
    const branch: string | undefined = pillarEntry?.branch;
    const rawCangGans = cangGanNodes.filter((n: any) => n.branchPos === `${pos}Branch`);
    const sortedCangGans = [...rawCangGans].sort(
      (a: any, b: any) => QI_ORDER.indexOf(a.qi) - QI_ORDER.indexOf(b.qi),
    );
    const stemShishen = stemNode ? shishenById.get(stemNode.id) : undefined;
    const benQiCg = sortedCangGans.find((cg: any) => cg.qi === 'BenQi');
    return {
      pos, stemNode, branch, stemShishen,
      branchWuxing: (benQiCg?.wuxing as string) ?? 'gray',
      cangGans: sortedCangGans.map((cg: any) => ({ ...cg, shishen: shishenById.get(cg.id) })),
    };
  });

  const dayStemNode = tianGanNodes.find((n: any) => n.pos === 'DayStem');
  const dayStemColor = ELEMENT_COLORS[dayStemNode?.wuxing ?? 'gray'] ?? ELEMENT_COLORS['gray'];

  return (
    <div
      style={{
        width: '100%', height: '100%', position: 'relative',
        background: 'hsl(var(--card))',
        border: '1px solid hsl(var(--border))',
        borderRadius: '16px',
        cursor: 'pointer',
        overflow: 'hidden',
      }}
      onClick={handleCardClick}
    >
      {/* Toggle开关 */}
      <button
        style={{
          position: 'absolute', top: 10, right: 10,
          zIndex: 10,
          background: 'hsl(var(--muted))',
          border: 'none', cursor: 'pointer',
          borderRadius: 999,
          width: 36, height: 20,
          display: 'flex', alignItems: 'center',
          padding: '2px',
        }}
        onClick={e => {
          e.stopPropagation();
          setMode(m => m === 'bazi' ? 'shishen' : 'bazi');
        }}
      >
        <motion.div
          animate={{ x: mode === 'bazi' ? 0 : 16 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          style={{
            width: 16, height: 16,
            borderRadius: '50%',
            background: 'hsl(var(--muted-foreground))',
            flexShrink: 0,
          }}
        />
      </button>

      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${VW} ${VH}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: 'block' }}
      >
        {/* 日干框：天干区内 */}
        <rect
          x={dayBoxX} y={dayBoxY}
          width={dayBoxW} height={dayBoxH}
          rx={10} fill="none"
          stroke={dayStemColor} strokeWidth="1.5" opacity="0.6"
        />

        {/* 四列分隔线：贯通整个viewBox */}
        {[1, 2, 3].map(i => (
          <line key={i}
            x1={COL_W * i} y1={4}
            x2={COL_W * i} y2={VH - 4}
            stroke="hsl(var(--border))" strokeWidth="1" opacity="0.4"
          />
        ))}

        {/* 地支藏干之间长横线（展开时） */}
        {expanded && (
          <line x1={0} y1={250} x2={VW} y2={250}
            stroke="hsl(var(--border))" strokeWidth="1" opacity="0.4" />
        )}

        {/* 四柱内容：坐标固定在0~250，展开不影响 */}
        {columns.map(({ pos, stemNode, branch, stemShishen, branchWuxing }, idx) => {
          const cx = COL_W * idx + COL_W / 2;
          const stemWuxing: string = stemNode?.wuxing ?? 'gray';
          const stemColor = ELEMENT_COLORS[stemWuxing] ?? ELEMENT_COLORS['gray'];
          const branchColor = ELEMENT_COLORS[branchWuxing] ?? ELEMENT_COLORS['gray'];
          const isUnknown = !stemNode || !branch;
          const isDay = pos === 'Day';
          const stemText = mode === 'bazi'
            ? (stemNode?.stem ? t(`tiangan.${stemNode.stem}`) : '?')
            : (isDay ? t('shishen.DayMaster') : (stemShishen ? t(`shishen.${stemShishen}`) : '?'));
          const stemFontSize = 34;

          return (
            <g key={pos}>
              <text x={cx} y={LABEL_Y}
                textAnchor="middle" dominantBaseline="middle"
                fontSize="10" letterSpacing="2"
                fill="hsl(var(--muted-foreground))" opacity="0.6"
              >{t(LABEL_KEYS[pos as Pos])}</text>

              {isUnknown ? (
                <text x={cx} y={STEM_Y} textAnchor="middle" dominantBaseline="middle"
                  fontSize="46" fill="hsl(var(--muted-foreground))" opacity="0.2">?</text>
              ) : (
                <text x={cx} y={STEM_Y}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={stemFontSize} fill={stemColor}
                  style={{ filter: `drop-shadow(0 0 6px ${stemColor}55)` }}
                >{stemText}</text>
              )}

              {/* 天干地支短横线 y=125 */}
              <line
                x1={cx - SHORT_LINE_HALF} y1={125}
                x2={cx + SHORT_LINE_HALF} y2={125}
                stroke="hsl(var(--muted-foreground))"
                strokeWidth="1" opacity="0.4"
              />

              {isUnknown ? (
                <text x={cx} y={BRANCH_Y} textAnchor="middle" dominantBaseline="middle"
                  fontSize="46" fill="hsl(var(--muted-foreground))" opacity="0.2">?</text>
              ) : (
                <text x={cx} y={BRANCH_Y}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize="34" fill={branchColor}
                  style={{ filter: `drop-shadow(0 0 6px ${branchColor}55)` }}
                >{branch ? t(`dizhi.${branch}`) : '?'}</text>
              )}
            </g>
          );
        })}

        {/* 藏干区：250~500，上对齐 */}
        <AnimatePresence>
          {expanded && (
            <motion.g
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {columns.map(({ pos, cangGans }, idx) => {
                const cx = COL_W * idx + COL_W / 2;
                const displayed = cangGans.slice(0, 3);
                return (
                  <g key={`${pos}-cang`}>
                    {displayed.map((cg: any, ci: number) => {
                      const cgColor = ELEMENT_COLORS[cg.wuxing as string] ?? ELEMENT_COLORS['gray'];
                      const display: string = mode === 'bazi'
                        ? (cg.stem ? t(`tiangan.${cg.stem}`) : '?')
                        : (cg.shishen ? t(`shishen.${cg.shishen}`) : '?');
                      const y = cangY(ci);
                      return (
                        <g key={cg.id ?? ci}>
                          {ci > 0 && (
                            <line
                              x1={cx - SHORT_LINE_HALF} y1={250 + CANG_ROW_H * ci}
                              x2={cx + SHORT_LINE_HALF} y2={250 + CANG_ROW_H * ci}
                              stroke="hsl(var(--muted-foreground))"
                              strokeWidth="1" opacity="0.3"
                            />
                          )}
                          <text x={cx} y={y}
                            textAnchor="middle" dominantBaseline="middle"
                            fontSize="20" fill={cgColor}
                          >{display}</text>
                        </g>
                      );
                    })}
                  </g>
                );
              })}
            </motion.g>
          )}
        </AnimatePresence>
      </svg>
    </div>
  );
}