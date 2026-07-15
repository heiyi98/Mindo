'use client';
import { useRef, useState } from 'react';
import { motion, useMotionValue, animate, type PanInfo } from 'framer-motion';
import MindCardBody from './MindCardBody';
import MindCardDetailModal from './MindCardDetailModal';
import type { MindCardStyleV2 } from '@/lib/mindCards/style';

export interface MindCard {
  id: string;
  user_id: string;
  content: string;
  style: MindCardStyleV2 | null;
  visibility: string;
  created_at: string;
  liked: boolean;
  favorited: boolean;
}

interface MindCardCarouselProps {
  cards: MindCard[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onToggleLike: (id: string, liked: boolean) => void;
  onFavoritedChange: (id: string, favorited: boolean) => void;
}

const SLIDE_WIDTH_PCT = 84;
const GAP_PCT = 4;
const CENTER_OFFSET_PCT = (100 - SLIDE_WIDTH_PCT) / 2;
const STEP_PCT = SLIDE_WIDTH_PCT + GAP_PCT;
const DRAG_COMMIT_RATIO = 0.28;
const FLICK_VELOCITY = 500;

// 浏览态小卡片：只负责视觉展示，点赞/收藏/未来的留言都移到点击后的弹窗里，
// 卡片本身不再承载任何交互控件（对应"未来的点赞留言收藏都会卡片点击后才出现"）
function Slide({ card, onOpen }: { card: MindCard; onOpen?: () => void }) {
  return (
    <div
      className="absolute top-0 h-full rounded-2xl overflow-hidden"
      style={{
        left: 'var(--slide-left)',
        width: `${SLIDE_WIDTH_PCT}%`,
        border: '1px solid hsl(var(--border))',
      }}
    >
      <MindCardBody style={card.style} className="w-full h-full" clipped onClick={onOpen} />
    </div>
  );
}

export default function MindCardCarousel({
  cards, currentIndex, onIndexChange, onToggleLike, onFavoritedChange,
}: MindCardCarouselProps) {
  const x = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const didDragRef = useRef(false);
  const [detailOpen, setDetailOpen] = useState(false);

  const current = cards[currentIndex];
  const prev = currentIndex > 0 ? cards[currentIndex - 1] : null;
  const next = currentIndex < cards.length - 1 ? cards[currentIndex + 1] : null;

  const step = (direction: 1 | -1) => {
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }
    const nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= cards.length) return;
    onIndexChange(nextIndex);
  };

  const openCurrent = () => {
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }
    setDetailOpen(true);
  };

  const handleDragEnd = (_e: PointerEvent, info: PanInfo) => {
    const containerWidth = containerRef.current?.offsetWidth ?? 1;
    const offsetRatio = info.offset.x / containerWidth;
    didDragRef.current = Math.abs(info.offset.x) > 5;

    let direction: 1 | -1 | 0 = 0;
    if (offsetRatio < -DRAG_COMMIT_RATIO || info.velocity.x < -FLICK_VELOCITY) direction = 1;
    else if (offsetRatio > DRAG_COMMIT_RATIO || info.velocity.x > FLICK_VELOCITY) direction = -1;

    if (direction !== 0) {
      const nextIndex = currentIndex + direction;
      if (nextIndex >= 0 && nextIndex < cards.length) {
        onIndexChange(nextIndex);
      }
    }
    animate(x, 0, { type: 'spring', stiffness: 400, damping: 40 });
  };

  if (!current) return null;

  return (
    <>
      <div
        ref={containerRef}
        className="relative w-full"
        style={{
          aspectRatio: '3 / 4',
          maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
          WebkitMaskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
        }}
      >
        <motion.div
          className="relative w-full h-full"
          style={{ x }}
          drag="x"
          dragElastic={0.15}
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={handleDragEnd}
        >
          {prev && (
            <div
              style={{ '--slide-left': `${CENTER_OFFSET_PCT - STEP_PCT}%` } as React.CSSProperties}
              onClick={() => step(-1)}
              className="cursor-pointer contents"
            >
              <Slide card={prev} />
            </div>
          )}
          <div style={{ '--slide-left': `${CENTER_OFFSET_PCT}%` } as React.CSSProperties} className="contents">
            <Slide card={current} onOpen={openCurrent} />
          </div>
          {next && (
            <div
              style={{ '--slide-left': `${CENTER_OFFSET_PCT + STEP_PCT}%` } as React.CSSProperties}
              onClick={() => step(1)}
              className="cursor-pointer contents"
            >
              <Slide card={next} />
            </div>
          )}
        </motion.div>
      </div>

      <MindCardDetailModal
        open={detailOpen}
        card={current}
        onClose={() => setDetailOpen(false)}
        onToggleLike={onToggleLike}
        onFavoritedChange={onFavoritedChange}
      />
    </>
  );
}