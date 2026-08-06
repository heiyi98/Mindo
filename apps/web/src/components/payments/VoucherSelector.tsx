'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

interface Voucher {
  id: string;
  coverage_type: 'full' | 'percentage' | 'fixed_amount';
  coverage_value: number;
  remaining_uses: number;
  issuer_label: string | null;
}

interface VoucherSelectorProps {
  serviceType: string;
  value: string | null;
  onChange: (voucherId: string | null) => void;
}

/**
 * 服务覆盖凭证选择器：自治组件，自己按serviceType拉取当前用户可用的凭证列表。
 * 没有可用凭证时不渲染任何内容（不占位）。
 */
export default function VoucherSelector({ serviceType, value, onChange }: VoucherSelectorProps) {
  const t = useTranslations('payment.voucher');
  const tPayment = useTranslations('payment');
  const unit = tPayment('walletUnit');
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    fetch(`/api/payments/vouchers?service_type=${encodeURIComponent(serviceType)}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setVouchers(d.vouchers ?? []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [serviceType]);

  if (!loaded || vouchers.length === 0) return null;

  const describe = (v: Voucher) => {
    const issuer = v.issuer_label ?? '';
    if (v.coverage_type === 'full') return t('full', { issuer });
    if (v.coverage_type === 'percentage') return t('percentage', { value: v.coverage_value, issuer });
    return t('fixedAmount', { value: v.coverage_value, issuer, unit });
  };

  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      className="text-sm rounded-xl px-3 py-2 w-full"
      style={{
        background: 'hsl(var(--card))',
        border: '1px solid hsl(var(--border))',
        color: 'hsl(var(--foreground))',
      }}
    >
      <option value="">{t('none', { unit })}</option>
      {vouchers.map((v) => (
        <option key={v.id} value={v.id}>
          {describe(v)}
        </option>
      ))}
    </select>
  );
}
