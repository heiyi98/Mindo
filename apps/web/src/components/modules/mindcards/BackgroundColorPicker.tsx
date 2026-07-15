'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { MindCardBackgroundColor } from '@/lib/mindCards/style';
import BottomSheetPopover from './BottomSheetPopover';

const OPTIONS: MindCardBackgroundColor[] = ['#000000', '#FFFFFF'];

interface BackgroundColorPickerProps {
  value: MindCardBackgroundColor;
  onChange: (color: MindCardBackgroundColor) => void;
}

// 触发图标：3:4比例的迷你彩色矩形，呼应卡片本身的比例
export default function BackgroundColorPicker({ value, onChange }: BackgroundColorPickerProps) {
  const t = useTranslations('mindcards');
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('composer.toolbar.backgroundColor')}
        title={t('composer.toolbar.backgroundColor')}
        className="flex items-center justify-center"
      >
        <span
          style={{
            width: 18,
            height: 24,
            borderRadius: 4,
            background: value || 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
          }}
        />
      </button>

      <BottomSheetPopover open={open} onClose={() => setOpen(false)}>
        <div className="flex flex-wrap gap-4 justify-center">
          {OPTIONS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange(c)}
              aria-label={c}
              className="rounded-xl"
              style={{
                width: 54,
                height: 72,
                background: c,
                border: value === c ? '2px solid hsl(var(--foreground))' : '1px solid hsl(var(--border))',
              }}
            />
          ))}
        </div>
      </BottomSheetPopover>
    </>
  );
}