'use client';
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { Sparkles } from 'lucide-react';

export const COLS = 1;
export const ROWS = 2;
export const CARD_META = { id: 'bazi-reading', cols: COLS, rows: ROWS, module: 'bazi' };

export default function BaziReadingCard({ profileId }: { profileId: string }) {
  const t = useTranslations('payment');
  const router = useRouter();
  const pathname = usePathname();
  const [snapshotId, setSnapshotId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!profileId) return;
    fetch(`/api/assessments/status?profile_id=${profileId}`)
      .then(r => r.json())
      .then(d => {
        const baziStatus = (d.status || []).find((s: any) => s.id === 'bazi');
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
    if (!snapshotId) return;
    const locale = pathname.split('/')[1];
    router.push(`/${locale}/dashboard/divination/bazi/reading?snapshotId=${snapshotId}`);
  };

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