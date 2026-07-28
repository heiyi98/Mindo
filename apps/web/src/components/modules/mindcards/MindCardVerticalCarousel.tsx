'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, animate, type PanInfo } from 'framer-motion';
import MindCardBody from './MindCardBody';
import type { MindCard } from './MindCardCarousel';

interface MindCardVerticalCarouselProps {
  cards: MindCard[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  cardWidth: number;
  cardHeight: number;
  onCardClick: (card: MindCard) => void;
}

const DRAG_COMMIT_RATIO = 0.28;
const FLICK_VELOCITY = 500;
const WHEEL_THRESHOLD = 20;
const WHEEL_COOLDOWN_MS = 400;
const SLIDE_TRANSITION = { type: 'spring', stiffness: 320, damping: 32 } as const;

// 跟横向版本同一套"伪纵深感"参数——上下相邻卡片缩小+变淡+错开，不是
// 裁切+算露出百分比那套，两侧（这里是上下）卡片是完整、缩小显示的卡片。
const SIDE_SCALE = 0.78;
const SIDE_OPACITY = 0.55;
const SIDE_X_OFFSET_PX = 0; // 纵向版本没有左右错位，保持居中
const STEP_RATIO = 0.58;
const ENTER_STEP_RATIO = STEP_RATIO * 1.6;

function restingTransform(offset: number, cardH: number) {
  if (offset === 0) return { y: 0, x: 0, scale: 1, opacity: 1 };
  return { y: offset * cardH * STEP_RATIO, x: SIDE_X_OFFSET_PX, scale: SIDE_SCALE, opacity: SIDE_OPACITY };
}

function enterTransform(offset: number, cardH: number) {
  if (offset === 0) return { y: 0, x: 0, scale: 1, opacity: 0 };
  return { y: offset * cardH * ENTER_STEP_RATIO, x: SIDE_X_OFFSET_PX, scale: SIDE_SCALE, opacity: 0 };
}

export default function MindCardVerticalCarousel({
  cards, currentIndex, onIndexChange, cardWidth, cardHeight, onCardClick,
}: MindCardVerticalCarouselProps) {
  const dragY = useMotionValue(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const didDragRef = useRef(false);
  const wheelLockedRef = useRef(false);

  const current = cards[currentIndex];

  const goTo = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= cards.length) return;
    onIndexChange(nextIndex);
  };

  const step = (direction: 1 | -1) => {
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }
    goTo(currentIndex + direction);
  };

  const openCurrent = () => {
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }
    if (current) onCardClick(current);
  };

  const handleDragEnd = (_e: PointerEvent, info: PanInfo) => {
    const offsetRatio = info.offset.y / cardHeight;
    didDragRef.current = Math.abs(info.offset.y) > 5;

    let direction: 1 | -1 | 0 = 0;
    if (offsetRatio < -DRAG_COMMIT_RATIO || info.velocity.y < -FLICK_VELOCITY) direction = 1;
    else if (offsetRatio > DRAG_COMMIT_RATIO || info.velocity.y > FLICK_VELOCITY) direction = -1;

    if (direction !== 0) goTo(currentIndex + direction);
    animate(dragY, 0, SLIDE_TRANSITION);
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') goTo(currentIndex - 1);
      else if (e.key === 'ArrowDown') goTo(currentIndex + 1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, cards.length]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      // 卡片范围内的滚轮，只负责切卡片，不能让这次滚动继续往外传导致
      // 页面也跟着滚——必须用非被动监听（{passive:false}）才能真正
      // 拦住默认滚动，用{passive:true}拦不住，会出现"切卡片的同时
      // 页面也跟着抖一下"这种不干净的观感。
      e.preventDefault();
      if (wheelLockedRef.current) return;
      if (Math.abs(e.deltaY) < WHEEL_THRESHOLD) return;
      wheelLockedRef.current = true;
      goTo(currentIndex + (e.deltaY > 0 ? 1 : -1));
      setTimeout(() => { wheelLockedRef.current = false; }, WHEEL_COOLDOWN_MS);
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, cards.length]);

  const windowCards = [-1, 0, 1]
    .map((offset) => ({ offset, card: cards[currentIndex + offset] }))
    .filter((s) => s.card);

  if (!current) return null;

  return (
    <div ref={trackRef} className="relative flex-shrink-0" style={{ width: cardWidth, height: cardHeight }}>
      <motion.div
        className="absolute inset-0"
        style={{ y: dragY }}
        drag="y"
        dragElastic={0.15}
        dragConstraints={{ top: 0, bottom: 0 }}
        onDragEnd={handleDragEnd}
      >
        {windowCards.map(({ offset, card }) => {
          const isCurrent = offset === 0;
          return (
            <motion.div
              key={card!.id}
              className="absolute left-0 rounded-2xl overflow-hidden cursor-pointer"
              style={{
                width: cardWidth,
                height: cardHeight,
                top: '50%',
                marginTop: -cardHeight / 2,
                border: '1px solid hsl(var(--border))',
                zIndex: isCurrent ? 2 : 1,
              }}
              initial={enterTransform(offset, cardHeight)}
              animate={restingTransform(offset, cardHeight)}
              transition={SLIDE_TRANSITION}
              onClick={() => (isCurrent ? openCurrent() : step(offset > 0 ? 1 : -1))}
            >
              <MindCardBody style={card!.style} className="w-full h-full" clipped />
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}