'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ticket } from 'lucide-react';
import { getAssessmentByServiceType } from '@/config/assessments';

interface Voucher {
  id: string;
  service_type: string;
  coverage_type: 'full' | 'percentage' | 'fixed_amount';
  coverage_value: number;
  remaining_uses: number;
}

interface AssetsData {
  balance: number;
  vipExpiresAt: string | null;
  vouchers: Voucher[];
}

export default function PendingAssetsTab() {
  const t = useTranslations('assets');
  const tAssessments = useTranslations('assessments');
  const tRedeem = useTranslations('payment.redeem');
  const tPayment = useTranslations('payment');
  const unit = tPayment('walletUnit');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<AssetsData>({
    queryKey: ['payment-assets'],
    queryFn: async () => {
      const res = await fetch('/api/payments/assets');
      if (!res.ok) throw new Error('Failed to fetch assets');
      return res.json();
    },
  });

  const [code, setCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const handleRedeem = async () => {
    if (redeeming || !code.trim()) return;
    setRedeeming(true);
    setMessage(null);
    try {
      const res = await fetch('/api/payments/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      const result = await res.json();
      if (!res.ok) {
        const errorMap: Record<string, string> = {
          code_not_found: tRedeem('errors.codeNotFound'),
          already_redeemed: tRedeem('errors.alreadyRedeemed'),
          code_expired: tRedeem('errors.codeExpired'),
        };
        setMessage({ ok: false, text: errorMap[result.code] ?? tRedeem('errors.generic') });
        return;
      }
      setMessage({ ok: true, text: tRedeem('success') });
      setCode('');
      queryClient.invalidateQueries({ queryKey: ['payment-assets'] });
    } catch {
      setMessage({ ok: false, text: tRedeem('errors.generic') });
    } finally {
      setRedeeming(false);
    }
  };

  const describeCoverage = (v: Voucher) => {
    if (v.coverage_type === 'full') return t('vouchers.coverageFull');
    if (v.coverage_type === 'percentage') return t('vouchers.coveragePercentage', { value: v.coverage_value });
    return t('vouchers.coverageFixedAmount', { value: v.coverage_value, unit });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div
          className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'hsl(var(--foreground) / 0.3)' }}
        />
      </div>
    );
  }

  const balance = data?.balance ?? 0;
  const vipExpiresAt = data?.vipExpiresAt ?? null;
  const vipActive = !!vipExpiresAt && new Date(vipExpiresAt).getTime() > Date.now();
  const vouchers = data?.vouchers ?? [];

  return (
    <div className="space-y-4">
      <div
        className="rounded-2xl p-4 flex items-center justify-between"
        style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
      >
        <span className="text-sm font-light" style={{ color: 'hsl(var(--muted-foreground))' }}>
          {t('wallet.balance', { unit })}
        </span>
        <span className="text-base font-light" style={{ color: 'hsl(var(--foreground))' }}>
          {balance}
        </span>
      </div>

      <div
        className="rounded-2xl p-4 flex items-center justify-between"
        style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
      >
        <span className="text-sm font-light" style={{ color: 'hsl(var(--muted-foreground))' }}>
          {t('vouchers.title')}
        </span>
        <span className="text-sm font-light" style={{ color: 'hsl(var(--foreground))' }}>
          {vipActive
            ? t('vip.activeUntil', { date: new Date(vipExpiresAt!).toLocaleDateString() })
            : t('vip.inactive')}
        </span>
      </div>

      <div>
        <p className="text-xs font-light mb-2" style={{ color: 'hsl(var(--muted-foreground) / 0.7)' }}>
          {t('vouchers.title')}
        </p>
        {vouchers.length === 0 ? (
          <p className="text-sm font-light py-4" style={{ color: 'hsl(var(--muted-foreground) / 0.5)' }}>
            {t('vouchers.empty')}
          </p>
        ) : (
          <div className="space-y-2">
            {vouchers.map((v) => {
              const assessment = getAssessmentByServiceType(v.service_type);
              return (
                <div
                  key={v.id}
                  className="rounded-2xl p-4 flex items-center gap-3"
                  style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                >
                  <Ticket size={16} style={{ color: 'hsl(var(--muted-foreground))' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-light" style={{ color: 'hsl(var(--foreground))' }}>
                      {assessment ? tAssessments(`${assessment.id}.name`) : v.service_type}
                    </p>
                    <p className="text-xs font-light" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      {describeCoverage(v)} · {t('vouchers.remainingUses', { count: v.remaining_uses })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-2xl p-4 flex gap-2" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder={tRedeem('placeholder')}
          className="flex-1 px-3 py-2 rounded-xl text-sm font-light tracking-wide focus:outline-none"
          style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--foreground))', border: '1px solid hsl(var(--border))' }}
        />
        <button
          onClick={handleRedeem}
          disabled={redeeming || !code.trim()}
          className="px-4 py-2 rounded-xl text-sm font-light disabled:opacity-30"
          style={{ background: 'hsl(var(--foreground))', color: 'hsl(var(--background))' }}
        >
          {redeeming ? '...' : tRedeem('submit')}
        </button>
      </div>
      {message && (
        <p className="text-xs font-light" style={{ color: message.ok ? '#4ade80' : 'hsl(var(--destructive))' }}>
          {message.text}
        </p>
      )}
    </div>
  );
}
