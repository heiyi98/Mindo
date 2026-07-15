'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { MIND_CARD_TEXT_COLORS } from '@/lib/mindCards/style';
import BottomSheetPopover from './BottomSheetPopover';

interface ColorPickerProps {
  value: string; // '' 或 MIND_CARD_TEXT_COLORS 之一，反映当前选区/光标处的颜色，用于给图标染色
  onChange: (color: string) => void;
}

// 标准文字颜色图标惯例：染色的"A"字母 + 下方同色色条
function ColorIcon({ color }: { color: string }) {
  const tint = color || 'hsl(var(--foreground))';
  return (
    <span className="flex flex-col items-center gap-0.5">
      <span style={{ color: tint, fontSize: 14, fontWeight: 600, lineHeight: 1 }}>A</span>
      <span style={{ width: 14, height: 2, background: tint, borderRadius: 1 }} />
    </span>
  );
}

export default function ColorPicker({ value, onChange }: ColorPickerProps) {
  const t = useTranslations('mindcards');
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('composer.toolbar.color')}
        title={t('composer.toolbar.color')}
        className="flex items-center justify-center w-7 h-7 rounded-lg"
      >
        <ColorIcon color={value} />
      </button>

      <BottomSheetPopover open={open} onClose={() => setOpen(false)}>
        <div className="flex flex-wrap gap-3 justify-center">
          {MIND_CARD_TEXT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange(c)}
              aria-label={c}
              className="rounded-full"
              style={{
                width: 40,
                height: 40,
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