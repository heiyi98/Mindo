'use client';

import { useEffect, useState } from 'react';
import VoucherCard, { type Voucher } from './VoucherCard';

interface VoucherSelectorProps {
  serviceType: string;
  value: string | null;
  onChange: (voucher: Voucher | null) => void;
}

/**
 * 服务覆盖凭证选择器：自治组件，自己按serviceType拉取当前用户可用的凭证列表，
 * 渲染成可点击选中的卡片（复用VoucherCard，跟资产页样式一致）。
 * 没有可用凭证时不渲染任何内容（不占位）。再次点击已选中的卡片取消选择。
 */
export default function VoucherSelector({ serviceType, value, onChange }: VoucherSelectorProps) {
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

  return (
    <div className="flex flex-col gap-2 w-full">
      {vouchers.map((v) => (
        <VoucherCard
          key={v.id}
          voucher={v}
          showServiceName={false}
          selected={value === v.id}
          onClick={() => onChange(value === v.id ? null : v)}
        />
      ))}
    </div>
  );
}
