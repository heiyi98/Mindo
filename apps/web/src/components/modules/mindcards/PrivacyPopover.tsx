'use client';
import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Eye } from 'lucide-react';
import type { CardVisibility } from '@/lib/mindCards/visibility';

const VISIBILITY_OPTIONS: CardVisibility[] = ['public', 'followers', 'friends', 'private'];

interface PrivacyPopoverProps {
  value: CardVisibility;
  onChange: (v: CardVisibility) => void;
}

export default function PrivacyPopover({ value, onChange }: PrivacyPopoverProps) {
  const t = useTranslations('mindcards');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t('composer.toolbar.privacyButton')}
        title={t('composer.toolbar.privacyButton')}
        className="flex items-center justify-center w-7 h-7 rounded-lg"
        style={{ color: 'hsl(var(--foreground))' }}
      >
        <Eye size={16} />
      </button>

      {open && (
        // 弹窗左下角盖住眼睛图标本身：绝对定位锚定在这个相对容器的左下角，向右上方展开
        <div
          className="absolute z-30 rounded-2xl p-1.5 min-w-[140px]"
          style={{
            bottom: 0,
            left: 0,
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
          }}
        >
          {VISIBILITY_OPTIONS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => { onChange(v); setOpen(false); }}
              className="w-full text-left text-sm px-3 py-2 rounded-xl"
              style={{
                color: 'hsl(var(--foreground))',
                background: value === v ? 'hsl(var(--foreground) / 0.08)' : 'transparent',
              }}
            >
              {t(`visibility.${v}`)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
