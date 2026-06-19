'use client';
import { useTranslations } from 'next-intl';
import type { WidgetProps } from './index';

export default function BigFiveRadarWidget({ isEditMode: _ }: WidgetProps) {
  const t = useTranslations('dashboard');
  return (
    <div
      className="h-full flex items-center justify-center rounded-2xl"
      style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
    >
      <span className="text-xs font-light" style={{ color: 'hsl(var(--muted-foreground))' }}>
        {t('widgetNames.bigfive-radar')}
      </span>
    </div>
  );
}
