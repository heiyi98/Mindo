'use client';
import { Book, Plus, Bell } from 'lucide-react';

const HEIGHT = 64;

interface MindCardsArcMenuProps {
  onPublish: () => void;
  onOpenProfile: () => void;
  onOpenNotifications: () => void;
  // 未读提醒数——大于0时Bell图标右上角叠一个小红点，数字超过99显示"99+"
  unreadCount?: number;
}

// 胶囊三等分：grid-cols-3把胶囊分成三个等宽格子，每个按钮在自己所在的格子里
// 居中——不再是"+"单独浮在胶囊上方凸起的特殊处理，三个图标待遇完全一致。
export default function MindCardsArcMenu({ onPublish, onOpenProfile, onOpenNotifications, unreadCount = 0 }: MindCardsArcMenuProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pointer-events-none pb-4">
      <div
        className="w-full max-w-xl mx-4 pointer-events-auto grid grid-cols-3 items-center"
        style={{
          height: HEIGHT,
          borderRadius: HEIGHT / 2,
          background: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
        }}
      >
        <button
          type="button"
          onClick={onOpenProfile}
          className="flex items-center justify-center"
          style={{ color: 'hsl(var(--foreground))' }}
        >
          <Book size={20} />
        </button>

        <button
          type="button"
          onClick={onPublish}
          className="flex items-center justify-center"
          style={{ color: 'hsl(var(--foreground))' }}
        >
          <Plus size={22} />
        </button>

        <button
          type="button"
          onClick={onOpenNotifications}
          className="relative flex items-center justify-center"
          style={{ color: 'hsl(var(--foreground))' }}
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span
              className="absolute flex items-center justify-center rounded-full px-1"
              style={{
                top: 2, right: 6, minWidth: 14, height: 14, fontSize: 9,
                background: '#FF3B30', color: '#fff', lineHeight: 1,
              }}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}