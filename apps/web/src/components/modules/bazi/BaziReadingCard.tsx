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

  const handleClick = () => {
    if (readingId) {
      // 已有报告，直接查看。不用再手动拼语言前缀——
      // @/i18n/navigation 的 router 会自动带上当前语言。
      router.push(`/dashboard/assessments/bazi/reading?readingId=${readingId}`);
    } else if (snapshotId) {
      // 有八字盘但没有报告，触发生成
      fetch('/api/ai/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshotId }),
      }).then(r => r.json()).then(d => {
        if (d.readingId) {
          router.push(`/dashboard/assessments/bazi/reading?readingId=${d.readingId}`);
        }
      });
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