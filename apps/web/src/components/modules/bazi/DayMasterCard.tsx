'use client';
import { useState, useEffect } from 'react';

const STEM_PINYIN: Record<string, string> = {
  '甲': 'jia', '乙': 'yi', '丙': 'bing', '丁': 'ding', '戊': 'wu',
  '己': 'ji', '庚': 'geng', '辛': 'xin', '壬': 'ren', '癸': 'gui',
};

const ELEMENT_COLORS: Record<string, string> = {
  Wood:  '#388E3C',
  Fire:  '#D32F2F',
  Earth: '#F57F17',
  Metal: '#757575',
  Water: '#1976D2',
};

const WUXING_LABELS: Record<string, string> = {
  Wood: '木', Fire: '火', Earth: '土', Metal: '金', Water: '水',
};

export const COLS = 2;
export const ROWS = 3;
export const CARD_META = { id: 'day-master', cols: COLS, rows: ROWS, module: 'bazi' };

export default function DayMasterCard({ profileId }: { profileId: string }) {
  const [imgFailed, setImgFailed] = useState(false);
  const [bazi, setBazi] = useState<any>(null);

  useEffect(() => {
    if (!profileId) return;
    setImgFailed(false);
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

  const dayStem: string = bazi.dayStem ?? '';
  const element: string = bazi.pillars?.tianGanNodes?.find((n: any) => n.pos === 'DayStem')?.wuxing ?? 'Water';
  const pinyin = STEM_PINYIN[dayStem];
  const color = ELEMENT_COLORS[element] ?? '#6b7280';
  const wuxingLabel = WUXING_LABELS[element] ?? element;

  return (
    <div
      className="rounded-2xl"
      style={{
        background: 'hsl(var(--card))',
        border: '1px solid hsl(var(--border))',
        overflow: 'hidden',
        position: 'relative',
        width: '100%',
        height: '100%',
      }}
    >
      {pinyin && !imgFailed && (
        <img
          src={`/images/daymasters/${pinyin}.png`}
          alt={dayStem}
          onError={() => setImgFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      )}

      {(!pinyin || imgFailed) && (
        <div
          style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <span style={{
            fontSize: '80px',
            color,
            filter: `drop-shadow(0 0 24px ${color}66)`,
            opacity: 0.6,
          }}>
            {dayStem || '?'}
          </span>
        </div>
      )}

      <div
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'linear-gradient(to top, hsl(var(--card)) 60%, transparent)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
          padding: '0 16px 12px',
          paddingTop: '48px',
        }}
      >
        <span style={{ fontSize: '28px', color, lineHeight: 1 }}>{dayStem}</span>
        <span style={{ fontSize: '13px', color: 'hsl(var(--muted-foreground))' }}>{wuxingLabel}</span>
      </div>
    </div>
  );
}
