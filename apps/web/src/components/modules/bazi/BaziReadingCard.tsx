'use client';
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Sparkles } from 'lucide-react';

export const COLS = 1;
export const ROWS = 2;
export const CARD_META = { id: 'bazi-reading', cols: COLS, rows: ROWS, module: 'bazi' };

export default function BaziReadingCard({ profileId }: { profileId: string }) {
  const t = useTranslations('payment');
  const router = useRouter();
  const [readingId, setReadingId] = useState<string | null>(null);
  const [snapshotId, setSnapshotId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!profileId) return;
    fetch(`/api/assessments/status?profile_id=${profileId}`)
      .then(r => r.json())
      .then(d => {
        const baziStatus = (d.status || []).find((s: any) => s.id === 'bazi');
        setReadingId(baziStatus?.readingId ?? null);
        setSnapshotId(baziStatus?.snapshotId ?? null);
        setLoaded(true);
      })
      .catch(() => { setLoaded(true); });
  }, [profileId]);

  if (!loaded) {
    return (
      <div
        className="rounded-2xl"
        style={{ width: '100%', height: '100%', background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
      />
    );
  }

  // 点卡片只负责免费进入报告页面，不做任何扣款/余额判断——是否生成、
  // 用不用兑换券，都是进了报告页面之后用户自己在"生成报告"按钮那一步的决定
  const handleClick = () => {
    if (readingId) {
      router.push(`/dashboard/assessments/bazi/reading?readingId=${readingId}`);
    } else if (snapshotId) {
      router.push(`/dashboard/assessments/bazi/reading?snapshotId=${snapshotId}`);
    }
  };

  if (!snapshotId) return (
    <div
      className="rounded-2xl"
      style={{ width: '100%', height: '100%', background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
    />
  );

  return (
    <div
      className="rounded-2xl flex items-center justify-center cursor-pointer"
      onClick={handleClick}
      style={{
        width: '100%',
        height: '100%',
        background: 'hsl(var(--card))',
        border: '1px solid hsl(var(--border))',
      }}
    >
      <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-light"
        style={{ color: 'hsl(var(--foreground))' }}
      >
        <Sparkles size={14} />
        {t('viewReading')}
      </div>
    </div>
  );
}