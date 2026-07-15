'use client';
import type { ReactNode } from 'react';

interface BottomSheetPopoverProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

// 字体/颜色/背景色三个菜单共用的底部弹出外壳：大圆角、浅色底、宽松留白，点击遮罩关闭。
export default function BottomSheetPopover({ open, onClose, children }: BottomSheetPopoverProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'hsl(var(--background) / 0.5)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-t-3xl p-6 pb-8"
        style={{ background: 'hsl(var(--card))' }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
