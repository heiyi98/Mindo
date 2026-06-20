'use client';
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Sparkles } from 'lucide-react';

export const COLS = 1;
export const ROWS = 2;
export const CARD_META = { id: 'bazi-reading', cols: COLS, rows: ROWS, module: 'bazi' };

export default function BaziReadingCard({ profileId }: { profileId: string }) {
  const t = useTranslations('payment');
  const [hasReading, setHasReading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    if (!profileId) return;
    fetch(`/api/assessments/status?profile_id=${profileId}`)
      .then(r => r.json())
      .then(d => {
        const baziStatus = (d.status || []).find((s: any) => s.id === 'bazi');
        setHasReading(baziStatus?.hasAiReading ?? false);
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

  const handleBuy = async () => {
    setBuying(true);
    try {
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessment_type: 'bazi', profile_id: profileId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error(err);
    } finally {
      setBuying(false);
    }
  };

  if (hasReading) {
    return (
      <div
        className="rounded-2xl flex items-center justify-center"
        style={{
          width: '100%',
          height: '100%',
          background: 'hsl(var(--card))',
          border: '1px solid rgba(168,85,247,0.4)',
          boxShadow: '0 0 24px rgba(168,85,247,0.08)',
        }}
      >
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-light"
          style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--foreground))' }}
        >
          <Sparkles size={14} />
          {t('readingUnlocked')}
        </button>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl flex items-center justify-center"
      style={{
        width: '100%',
        height: '100%',
        background: 'hsl(var(--muted) / 0.2)',
        border: '1px dashed hsl(var(--border))',
      }}
    >
      <button
        onClick={handleBuy}
        disabled={buying}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-light transition-all disabled:opacity-50"
        style={{
          background: 'hsl(var(--foreground))',
          color: 'hsl(var(--background))',
          cursor: 'pointer',
        }}
      >
        <Sparkles size={14} />
        {buying ? t('loading') : t('buyReading')}
      </button>
    </div>
  );
}
