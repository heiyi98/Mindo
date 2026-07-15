'use client';
import { useState } from 'react';
import BottomSheetPopover from './BottomSheetPopover';

// 跟文字颜色共用同一套8个iOS系统色，''代表"无背景色"（取消高亮）
const OPTIONS = ['', '#000000', '#FF3B30', '#FF9500', '#34C759', '#007AFF', '#AF52DE', '#FF2D55', '#FFFFFF'] as const;

interface TextHighlightPickerProps {
  value: string;
  onChange: (color: string) => void;
}

// 触发图标："A"背后垫一块圆角色块——颜色在文字背后整块打底=背景色，
// 跟"文字颜色"(A本身染色+下划线色条)的图标语言区分开
export default function TextHighlightPicker({ value, onChange }: TextHighlightPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex items-center justify-center">
        <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16 }}>
          <span style={{ position: 'absolute', inset: 0, borderRadius: 4, background: value || 'transparent', border: value ? 'none' : '1px solid hsl(var(--border))' }} />
          <span style={{ position: 'relative', fontSize: 11, fontWeight: 700, color: 'hsl(var(--foreground))' }}>A</span>
        </span>
      </button>

      <BottomSheetPopover open={open} onClose={() => setOpen(false)}>
        <div className="flex flex-wrap gap-3 justify-center">
          {OPTIONS.map((c) => (
            <button
              key={c || 'none'}
              type="button"
              onClick={() => onChange(c)}
              className="rounded-full"
              style={{
                width: 32,
                height: 32,
                background: c || 'transparent',
                border: value === c ? '2px solid hsl(var(--foreground))' : '1px solid hsl(var(--border))',
              }}
            />
          ))}
        </div>
      </BottomSheetPopover>
    </>
  );
}