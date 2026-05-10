'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Sparkles } from 'lucide-react';

interface BuyReadingButtonProps {
  assessmentType: string;
  profileId: string;
  hasReading: boolean;
}

export default function BuyReadingButton({
  assessmentType,
  profileId,
  hasReading,
}: BuyReadingButtonProps) {
  const t = useTranslations('payment');
  const [loading, setLoading] = useState(false);

  const handleBuy = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessment_type: assessmentType, profile_id: profileId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (hasReading) {
    return (
      <div
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-light"
        style={{
          background: 'hsl(var(--foreground) / 0.05)',
          color: 'hsl(var(--muted-foreground))',
        }}
      >
        <Sparkles size={14} />
        {t('readingUnlocked')}
      </div>
    );
  }

  return (
    <button
      onClick={handleBuy}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-light transition-all disabled:opacity-50"
      style={{
        background: 'hsl(var(--foreground))',
        color: 'hsl(var(--background))',
        cursor: 'pointer',
      }}
    >
      <Sparkles size={14} />
      {loading ? t('loading') : t('buyReading')}
    </button>
  );
}
