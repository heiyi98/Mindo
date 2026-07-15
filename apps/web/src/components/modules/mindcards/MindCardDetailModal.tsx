'use client';
import { useState } from 'react';
import { X, Album } from 'lucide-react';
import MindCardBody from './MindCardBody';
import FolderMultiSelectPopover from './FolderMultiSelectPopover';
import type { MindCard } from './MindCardCarousel';

interface MindCardDetailModalProps {
  open: boolean;
  card: MindCard;
  onClose: () => void;
  onFavoritedChange: (id: string, favorited: boolean) => void;
}

// 弹窗尺寸锁定：横板（横排文字）卡片锁宽，触碰无限排列时纵向滚动；
// 竖版（竖排文字）卡片锁高，触碰无限排列时横向滚动。
// 只固定一个维度、aspectRatio自动推出另一个维度的具体像素值，这个推出的值本身
// 不会随内容增长而变化（浏览器只在设置时计算一次），弹窗框体本身永远是这个固定大小，
// 多出来的内容在框内滚动，不会把弹窗撑大。
export default function MindCardDetailModal({
  open, card, onClose, onFavoritedChange,
}: MindCardDetailModalProps) {
  const [folderPickerOpen, setFolderPickerOpen] = useState(false);
  if (!open) return null;

  const vertical = card.style?.card.vertical ?? false;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'hsl(var(--background) / 0.6)' }}
      onClick={onClose}
    >
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          aspectRatio: '3 / 4',
          width: vertical ? undefined : 'min(90vw, 400px)',
          height: vertical ? 'min(85vh, 533px)' : undefined,
          border: '1px solid hsl(var(--border))',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="w-full h-full"
          style={{
            overflowY: vertical ? 'hidden' : 'auto',
            overflowX: vertical ? 'auto' : 'hidden',
          }}
        >
          <MindCardBody style={card.style} className="w-full h-full" />
        </div>

        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 flex items-center justify-center rounded-full"
          style={{ width: 28, height: 28, background: 'hsl(var(--background) / 0.7)', color: 'hsl(var(--foreground))' }}
        >
          <X size={16} />
        </button>

        <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
          <span className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
            {new Date(card.created_at).toLocaleString()}
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setFolderPickerOpen(true); }}
              style={{ color: 'hsl(var(--foreground))' }}
            >
              <Album size={14} fill={card.favorited ? 'currentColor' : 'none'} />
            </button>
          </div>
        </div>
      </div>

      <FolderMultiSelectPopover
        open={folderPickerOpen}
        cardId={card.id}
        onClose={() => setFolderPickerOpen(false)}
        onFavoritedChange={(favorited) => onFavoritedChange(card.id, favorited)}
      />
    </div>
  );
}