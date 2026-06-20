'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

export const COLS = 2;
export const ROWS = 1;

export interface ReadingCardProps {
  profileId: string;
  hasReading: boolean;
}

export default function ReadingCard({ profileId, hasReading }: ReadingCardProps) {
  const t = useTranslations('payment');
  const [loading, setLoading] = useState(false);

  const handleBuy = async () => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  return (
    <div
      className="rounded-2xl flex items-center justify-center p-4"
      style={{
        width: '100%',
        height: '100%',
        ...(hasReading
          ? {
              background: 'hsl(var(--card))',
              border: '1px solid rgba(168,85,247,0.4)',
              boxShadow: '0 0 24px rgba(168,85,247,0.08)',
            }
          : {
              background: 'hsl(var(--muted) / 0.2)',
              border: '1px dashed hsl(var(--border))',
            }),
      }}
    >
      {hasReading ? (
        <button
          className="text-xs px-4 py-2 rounded-xl font-light"
          style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--foreground))' }}
        >
          {t('readingUnlocked')}
        </button>
      ) : (
        <button
          onClick={handleBuy}
          disabled={loading}
          className="text-xs px-3 py-2.5 rounded-xl font-light transition-all disabled:opacity-50 text-center"
          style={{ background: 'hsl(var(--foreground))', color: 'hsl(var(--background))', cursor: 'pointer' }}
        >
          {loading ? t('loading') : t('buyReading')}
        </button>
      )}
    </div>
  );
}
