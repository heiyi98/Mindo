'use client';
import type { ReactNode } from 'react';
import { BookHeart } from 'lucide-react';
import MindCardBody from './MindCardBody';
import type { MindCardStyleV2 } from '@/lib/mindCards/style';

interface MindCardFolderCardProps {
  displayName: string;
  isDefault: boolean;
  coverStyle: MindCardStyleV2 | null;
  emptyLabel: string;
  onClick?: () => void;
  // owner态的编辑/删除按钮，或订阅态的取消订阅按钮，由调用方决定放什么
  actions?: ReactNode;
}

// 统一的3:4展示框：只有名称+封面(取夹内最新一张卡片的内容渲染)，明确不显示数量/类型图标/
// 可见度标识——is_default的BookHeart徽标是唯一例外，用于标识"这是默认收藏夹"这件身份，
// 不是"类型"信息。
export default function MindCardFolderCard({
  displayName, isDefault, coverStyle, emptyLabel, onClick, actions,
}: MindCardFolderCardProps) {
  return (
    <div
      className="relative rounded-xl overflow-hidden"
      style={{ aspectRatio: '3 / 4', border: '1px solid hsl(var(--border))' }}
    >
      <div className="absolute inset-0 cursor-pointer" onClick={onClick}>
        {coverStyle ? (
          <MindCardBody style={coverStyle} className="w-full h-full" clipped />
        ) : (
          <div className="w-full h-full flex items-center justify-center px-3">
            <span className="text-xs text-center" style={{ color: 'hsl(var(--muted-foreground))' }}>
              {emptyLabel}
            </span>
          </div>
        )}
      </div>

      {isDefault && (
        <div
          className="absolute top-2 left-2 flex items-center justify-center rounded-full pointer-events-none"
          style={{ width: 22, height: 22, background: 'hsl(var(--background) / 0.7)', color: 'hsl(var(--foreground))' }}
        >
          <BookHeart size={12} />
        </div>
      )}

      <div
        className="absolute bottom-0 left-0 right-0 px-2 py-1.5 pointer-events-none"
        style={{ background: 'linear-gradient(to top, hsl(var(--background) / 0.85), transparent)' }}
      >
        <span className="text-xs font-medium truncate block" style={{ color: 'hsl(var(--foreground))' }}>
          {displayName}
        </span>
      </div>

      {actions && (
        <div className="absolute top-2 right-2 flex items-center gap-1">
          {actions}
        </div>
      )}
    </div>
  );
}
