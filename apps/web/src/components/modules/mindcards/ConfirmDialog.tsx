'use client';
import { useTranslations } from 'next-intl';

interface ConfirmDialogProps {
  title: string;
  body: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ConfirmDialog({ title, body, confirmLabel, onCancel, onConfirm }: ConfirmDialogProps) {
  const t = useTranslations('mindcards');
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'hsl(var(--background) / 0.6)' }}
      onClick={onCancel}
    >
      <div
        className="rounded-2xl p-5 max-w-xs w-full"
        style={{ background: 'hsl(var(--card))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm font-medium mb-2" style={{ color: 'hsl(var(--foreground))' }}>{title}</p>
        <p className="text-sm mb-4" style={{ color: 'hsl(var(--muted-foreground))' }}>{body}</p>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
            {t('folders.cancel')}
          </button>
          <button type="button" onClick={onConfirm} className="text-sm" style={{ color: '#FF3B30' }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}