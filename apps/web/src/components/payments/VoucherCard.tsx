'use client';

import { Ticket } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { getAssessmentByServiceType } from '@/config/assessments';

export interface Voucher {
  id: string;
  service_type: string;
  coverage_type: 'full' | 'percentage' | 'fixed_amount';
  coverage_value: number;
  remaining_uses: number;
}

interface VoucherCardProps {
  voucher: Voucher;
  /** 可点击选中场景（报告页选择支付方式）才需要，只读展示（资产页）不传 */
  onClick?: () => void;
  selected?: boolean;
  /** 资产页要看是哪个服务的凭证；报告页service_type本来就是页面上下文，不用再显示一遍 */
  showServiceName?: boolean;
}

/**
 * 兑换券卡片：资产页（只读展示）和报告页（可点击选中支付方式）共用同一份样式，
 * 不要在报告页另外设计一套。onClick存在时渲染成可点击的button，不存在时是纯展示的div。
 */
export default function VoucherCard({ voucher, onClick, selected, showServiceName = true }: VoucherCardProps) {
  const t = useTranslations('payment.voucher');
  const tAssessments = useTranslations('assessments');
  const tPayment = useTranslations('payment');
  const unit = tPayment('walletUnit');

  const describeCoverage = () => {
    if (voucher.coverage_type === 'full') return t('coverageFull');
    if (voucher.coverage_type === 'percentage') return t('coveragePercentage', { value: voucher.coverage_value });
    return t('coverageFixedAmount', { value: voucher.coverage_value, unit });
  };

  const assessment = showServiceName ? getAssessmentByServiceType(voucher.service_type) : null;

  const inner = (
    <>
      <Ticket size={16} style={{ color: 'hsl(var(--muted-foreground))' }} />
      <div className="flex-1 min-w-0">
        {showServiceName && (
          <p className="text-sm font-light" style={{ color: 'hsl(var(--foreground))' }}>
            {assessment ? tAssessments(`${assessment.id}.name`) : voucher.service_type}
          </p>
        )}
        <p
          className={showServiceName ? 'text-xs font-light' : 'text-sm font-light'}
          style={{ color: showServiceName ? 'hsl(var(--muted-foreground))' : 'hsl(var(--foreground))' }}
        >
          {describeCoverage()} · {t('remainingUses', { count: voucher.remaining_uses })}
        </p>
      </div>
    </>
  );

  const cardStyle = {
    background: 'hsl(var(--card))',
    border: selected ? '1px solid hsl(var(--foreground))' : '1px solid hsl(var(--border))',
  };

  if (!onClick) {
    return (
      <div className="rounded-2xl p-4 flex items-center gap-3" style={cardStyle}>
        {inner}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl p-4 flex items-center gap-3 w-full text-left transition-colors"
      style={cardStyle}
    >
      {inner}
    </button>
  );
}
