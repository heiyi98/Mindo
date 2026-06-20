'use client';
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

const ELEMENT_COLORS: Record<string, string> = {
  Wood:  '#388E3C', Fire:  '#D32F2F', Earth: '#F57F17',
  Metal: '#757575', Water: '#1976D2', gray:  '#6b7280',
};

export interface TianGanNode { pos: string; stem: string; wuxing: string; yinyang: string; }
export interface CangGanNode { branchPos: string; qi: string; wuxing: string; }
export interface Pillar { stem: string; branch: string; shishenStem?: string; }
const UNKNOWN_PILLAR: Pillar = { stem: '?', branch: '?' };

export const COLS = 4;
export const ROWS = 2;
export const CARD_META = { id: 'bazi-chart', cols: COLS, rows: ROWS, module: 'bazi' };

export default function BaziChartCard({ profileId }: { profileId: string }) {
  const t = useTranslations('bazi');
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

  const pillars = bazi.pillars || {};
  const tianGanNodes: TianGanNode[] = bazi.pillars?.tianGanNodes || [];
  const cangGanNodes: CangGanNode[] = bazi.pillars?.cangGanNodes || [];

  const stemWuxingByPos = new Map(tianGanNodes.map(n => [n.pos, n.wuxing]));
  const branchWuxingByPos = new Map(
    cangGanNodes.filter(n => n.qi === 'BenQi').map(n => [n.branchPos, n.wuxing])
  );

  const VW = 500;
  const VH = 250;
  const COL_W = VW / 4;
  const LABEL_Y   = 28;
  const DIV_Y     = VH / 2;
  const BOX_TOP   = LABEL_Y + 16;
  const BOX_BOTTOM = DIV_Y - 8;
  const LOWER_MID = (DIV_Y + 8 + VH - 12) / 2;
  const BOX_H     = BOX_BOTTOM - BOX_TOP;
  const BOX_W     = COL_W - 16;
  const BOX_R     = 10;

  const columns = [
    { key: 'year',  label: t('year'),  pillar: pillars.year  ?? UNKNOWN_PILLAR, stemPos: 'YearStem',  branchPos: 'YearBranch'  },
    { key: 'month', label: t('month'), pillar: pillars.month ?? UNKNOWN_PILLAR, stemPos: 'MonthStem', branchPos: 'MonthBranch' },
    { key: 'day',   label: t('day'),   pillar: pillars.day   ?? UNKNOWN_PILLAR, stemPos: 'DayStem',   branchPos: 'DayBranch'   },
    { key: 'hour',  label: t('hour'),  pillar: pillars.hour  ?? UNKNOWN_PILLAR, stemPos: 'HourStem',  branchPos: 'HourBranch'  },
  ];

  return (
    <div
      className="flex items-center justify-center p-4 rounded-2xl"
      style={{
        width: '100%',
        height: '100%',
        background: 'hsl(var(--card))',
        border: '1px solid hsl(var(--border))',
      }}
    >
      <svg width="100%" height="100%" viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }}>
        {columns.map(({ key, pillar, stemPos, branchPos }, idx) => {
          const cx = COL_W * idx + COL_W / 2;
          const stemWuxing   = stemWuxingByPos.get(stemPos)    || 'gray';
          const branchWuxing = branchWuxingByPos.get(branchPos) || 'gray';
          const stemColor    = ELEMENT_COLORS[stemWuxing]   ?? ELEMENT_COLORS['gray'];
          const branchColor  = ELEMENT_COLORS[branchWuxing] ?? ELEMENT_COLORS['gray'];
          const isDay = key === 'day';
          const isUnknown = !pillar.stem || pillar.stem === '?' || pillar.stem === 'Unknown';

          const colX = COL_W * idx + 4;
          const colW = COL_W - 8;

          return (
            <g key={key}>
              <rect x={colX} y={4} width={colW} height={VH - 8} rx={14} fill={isDay ? 'hsl(var(--foreground) / 0.06)' : 'none'} stroke={isDay ? 'hsl(var(--foreground) / 0.15)' : 'hsl(var(--border))'} strokeWidth="1" />
              <text x={cx} y={LABEL_Y} textAnchor="middle" dominantBaseline="middle" fontSize="12" letterSpacing="3" fill="hsl(var(--muted-foreground))" opacity="0.7">{columns[idx].label}</text>
              {isUnknown ? (
                <>
                  <text x={cx} y={BOX_TOP + BOX_H / 2} textAnchor="middle" dominantBaseline="middle" fontSize="46" fill="hsl(var(--muted-foreground))" opacity="0.2">?</text>
                  <line x1={cx - 24} y1={DIV_Y} x2={cx + 24} y2={DIV_Y} stroke="hsl(var(--border))" strokeWidth="1" opacity="0.5" />
                  <text x={cx} y={LOWER_MID} textAnchor="middle" dominantBaseline="middle" fontSize="46" fill="hsl(var(--muted-foreground))" opacity="0.2">?</text>
                </>
              ) : (
                <>
                  {isDay ? (
                    <>
                      <rect x={cx - BOX_W / 2} y={BOX_TOP} width={BOX_W} height={BOX_H} rx={BOX_R} fill={`${stemColor}18`} stroke={stemColor} strokeWidth="1.5" />
                      <text x={cx} y={BOX_TOP + BOX_H / 2} textAnchor="middle" dominantBaseline="middle" fontSize="54" fill={stemColor} style={{ filter: `drop-shadow(0 0 8px ${stemColor}66)` }}>{pillar.stem}</text>
                    </>
                  ) : (
                    <text x={cx} y={BOX_TOP + BOX_H / 2} textAnchor="middle" dominantBaseline="middle" fontSize="54" fill={stemColor} style={{ filter: `drop-shadow(0 0 8px ${stemColor}66)` }}>{pillar.stem}</text>
                  )}
                  <line x1={cx - 24} y1={DIV_Y} x2={cx + 24} y2={DIV_Y} stroke="hsl(var(--border))" strokeWidth="1" opacity="0.6" />
                  <text x={cx} y={LOWER_MID} textAnchor="middle" dominantBaseline="middle" fontSize="54" fill={branchColor} style={{ filter: `drop-shadow(0 0 8px ${branchColor}66)` }}>{pillar.branch}</text>
                </>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
