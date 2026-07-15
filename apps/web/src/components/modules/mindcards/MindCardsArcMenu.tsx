'use client';
import { useEffect, useRef, useState } from 'react';
import { Book, Plus, Bell } from 'lucide-react';

const HEIGHT = 84;
const NOTCH_RADIUS = 36;
const CORNER_RADIUS = 24;

// 底部圆弧菜单栏外形：两端圆角矩形 + 中间一个凹陷的圆弧缺口，让加号按钮嵌在缺口里凸起。
// 手写路径坐标，风格上跟 ValveLogo/MindoMark 一致——用SVG弧线画自定义外形，不用现成矩形工具栏。
// viewBox宽度实时跟随容器实际像素宽度（ResizeObserver测量），保证圆弧/圆角不被非等比拉伸变形。
function buildBarPath(width: number) {
  const cx = width / 2;
  return `
    M 0 ${CORNER_RADIUS}
    Q 0 0 ${CORNER_RADIUS} 0
    L ${cx - NOTCH_RADIUS - 22} 0
    Q ${cx - NOTCH_RADIUS} 0 ${cx - NOTCH_RADIUS} 18
    A ${NOTCH_RADIUS} ${NOTCH_RADIUS} 0 0 0 ${cx + NOTCH_RADIUS} 18
    Q ${cx + NOTCH_RADIUS} 0 ${cx + NOTCH_RADIUS + 22} 0
    L ${width - CORNER_RADIUS} 0
    Q ${width} 0 ${width} ${CORNER_RADIUS}
    L ${width} ${HEIGHT}
    L 0 ${HEIGHT}
    Z
  `;
}

interface MindCardsArcMenuProps {
  onPublish: () => void;
  onOpenProfile: () => void;
}

export default function MindCardsArcMenu({ onPublish, onOpenProfile }: MindCardsArcMenuProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pointer-events-none">
      <div ref={containerRef} className="relative w-full max-w-xl pointer-events-auto" style={{ height: HEIGHT }}>
        {width > 0 && (
          <svg viewBox={`0 0 ${width} ${HEIGHT}`} className="absolute inset-0 w-full h-full">
            <path d={buildBarPath(width)} fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth={1} />
          </svg>
        )}

        <button
          type="button"
          onClick={onOpenProfile}
          className="absolute flex items-center justify-center"
          style={{
            left: '22%',
            bottom: 22,
            transform: 'translateX(-50%)',
            color: 'hsl(var(--foreground))',
          }}
        >
          <Book size={20} />
        </button>

        <button
          type="button"
          onClick={onPublish}
          className="absolute flex items-center justify-center rounded-full"
          style={{
            left: '50%',
            top: -18,
            transform: 'translateX(-50%)',
            width: 56,
            height: 56,
            background: 'hsl(var(--foreground))',
            color: 'hsl(var(--background))',
          }}
        >
          <Plus size={24} />
        </button>

        <button
          type="button"
          disabled
          className="absolute flex items-center justify-center"
          style={{
            left: '78%',
            bottom: 22,
            transform: 'translateX(-50%)',
            color: 'hsl(var(--muted-foreground))',
          }}
        >
          <Bell size={20} />
        </button>
      </div>
    </div>
  );
}
