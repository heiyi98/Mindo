'use client';
import { useTranslations } from 'next-intl';
import type { WidgetProps } from './index';

export default function BaziChartWidget({ isEditMode: _ }: WidgetProps) {
  const t = useTranslations('dashboard');
  return (
    <div
      className="h-full flex items-center justify-center rounded-2xl"
      style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
    >
      <span className="text-xs font-light" style={{ color: 'hsl(var(--muted-foreground))' }}>
        {t('widgetNames.bazi-chart')}
      </span>
    </div>
  );
}
