'use client';
import type { ReactNode } from 'react';
import { resolveCardFontFamilyCss } from '@/lib/mindCards/fontCatalog';

interface MindCardFolderCardProps {
  displayName: string;
  onClick?: () => void;
  // 目前仅"订阅"栏的取消订阅按钮在用；卡片集管理（编辑/删除）已经统一挪到点进
  // 卡片集之后的详情页里做，网格缩略图本身不再直接暴露任何管理操作。
  actions?: ReactNode;
}

// 统一的3:4展示框：封面永远只显示卡片集名字（居中，默认衬线字体），不预览夹内
//卡片内容——不管夹里有没有卡片、内容是什么，封面观感保持一致。未来会支持
// 自定义封面图，这次先不做。
export default function MindCardFolderCard({ displayName, onClick, actions }: MindCardFolderCardProps) {
  return (
    <div
      className="relative rounded-xl overflow-hidden flex items-center justify-center"
      style={{ aspectRatio: '3 / 4', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
    >
      <button
        type="button"
        onClick={onClick}
        className="absolute inset-0 flex items-center justify-center px-3"
      >
        <span
          className="text-sm text-center"
          style={{ color: 'hsl(var(--foreground))', fontFamily: resolveCardFontFamilyCss({}) }}
        >
          {displayName}
        </span>
      </button>

      {actions && (
        <div className="absolute top-2 right-2 flex items-center gap-1">
          {actions}
        </div>
      )}
    </div>
  );
}