'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, animate, type PanInfo } from 'framer-motion';
import { Bookmark, MessageSquareMore, SquareArrowOutUpRight } from 'lucide-react';
import html2canvas from 'html2canvas';
import MindCardBody from './MindCardBody';
import MindCardDetailModal from './MindCardDetailModal';
import FolderMultiSelectPopover from './FolderMultiSelectPopover';
import MindCardCommentModal from './MindCardCommentModal';
import type { MindCardStyleV2 } from '@/lib/mindCards/style';

export interface MindCard {
  id: string;
  user_id: string;
  content: string;
  style: MindCardStyleV2 | null;
  visibility: string;
  created_at: string;
  favorited: boolean;
  is_own?: boolean;
  // 只有"本"（folder_kind='notebook'）夹内的卡片列表接口会附带这个字段——
  // 这段是用户收藏这张卡片进"本"的时候当场写的批语，其他任何场景下这个字段
  // 都不会出现，读取时按undefined/null兜底即可。
  annotation?: string | null;
}

interface MindCardCarouselProps {
  cards: MindCard[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onFavoritedChange: (id: string, favorited: boolean) => void;
  // false=不显示收藏/留言/分享那一行按钮（卡片集的"明信片"模式复用轮播时用，
  // 那个场景不需要这条交互栏），默认true保持主浏览页原有行为不变。
  showActions?: boolean;
  // 卡片整体尺寸缩放比例，默认0.7。不同调用场景（主浏览页 vs 卡片集"明信片"）
  // 天生能用的空间预算不一样大——主浏览页固定占着顶部栏+底部菜单栏的空间，
  // 卡片集详情页是全屏独占、没有这些常驻元素占地方，同样打7折，折之前的
  // 基数本来就不一样大，折出来的结果也不会一样大。给这个比例开一个口子，
  // 让空间预算小的场景可以单独调高一点，弥补先天差距。
  sizeScale?: number;
}

const DEFAULT_CARD_SIZE_SCALE = 0.7;

const DRAG_COMMIT_RATIO = 0.28;
const FLICK_VELOCITY = 500;
const WHEEL_THRESHOLD = 20;
const WHEEL_COOLDOWN_MS = 400;
const BUTTON_ROW_RESERVED_PX = 40;
const SLIDE_TRANSITION = { type: 'spring', stiffness: 320, damping: 32 } as const;

// 两侧卡片的"伪纵深感"三件套：缩小+变淡+下移，模拟"退到后排"的透视错觉。
// 不再靠"裁切+精确算出露出百分比"那套算法去控制视觉效果——两侧卡片本身
// 就是完整、缩小显示的卡片，不存在"被裁掉一部分"的生硬边界，也就不需要
// 渐隐遮罩来柔化它。
const SIDE_SCALE = 0.78;
const SIDE_OPACITY = 0.55;
const SIDE_Y_OFFSET_PX = 24;
// 中心到两侧卡片中心点的水平位移，按卡片自身宽度的比例给（卡片越大，
// 两侧卡片离中心越远，视觉比例保持一致），凭效果调出来的经验值。
const STEP_RATIO = 0.58;
// 卡片刚好轮到、第一次出现在-1/0/+1这个窗口里时，进场起点比正常停留位置
// 更远一点、且完全透明——这样它是"从更远处滑入+淡入"到resting位置，
// 跟已经在画面里、只是从别的offset移动过来的卡片用的是同一套过渡节奏，
// 不会再出现"一个平滑滑动、一个瞬间闪现"这种割裂感。
const ENTER_STEP_RATIO = STEP_RATIO * 1.6;

function restingTransform(offset: number, cardW: number) {
  if (offset === 0) return { x: 0, y: 0, scale: 1, opacity: 1 };
  return { x: offset * cardW * STEP_RATIO, y: SIDE_Y_OFFSET_PX, scale: SIDE_SCALE, opacity: SIDE_OPACITY };
}

function enterTransform(offset: number, cardW: number) {
  if (offset === 0) return { x: 0, y: 0, scale: 1, opacity: 0 };
  return { x: offset * cardW * ENTER_STEP_RATIO, y: SIDE_Y_OFFSET_PX, scale: SIDE_SCALE, opacity: 0 };
}

export default function MindCardCarousel({
  cards, currentIndex, onIndexChange, onFavoritedChange, showActions = true,
  sizeScale = DEFAULT_CARD_SIZE_SCALE,
}: MindCardCarouselProps) {
  const dragX = useMotionValue(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const didDragRef = useRef(false);
  const wheelLockedRef = useRef(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [folderPickerOpen, setFolderPickerOpen] = useState(false);
  const [commentPopoverOpen, setCommentPopoverOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [exporting, setExporting] = useState(false);
  const currentCardRef = useRef<HTMLDivElement>(null);

  // 中间卡片的大小只由"能用的高度"决定，不再因为要给两侧卡片腾地方而牺牲高度——
  // 两侧卡片现在是靠缩小+变淡实现，不需要占用额外的横向布局空间，两件事彻底拆开。
  const [layout, setLayout] = useState<{ cardW: number; cardH: number } | null>(null);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const compute = () => {
      const availW = el.clientWidth;
      const availH = el.clientHeight - (showActions ? BUTTON_ROW_RESERVED_PX : 0);
      if (availW <= 0 || availH <= 0) return;
      let cardH = availH;
      let cardW = (cardH * 3) / 4;
      if (cardW > availW) {
        cardW = availW;
        cardH = (cardW * 4) / 3;
      }
      setLayout({ cardW: cardW * sizeScale, cardH: cardH * sizeScale });
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [showActions, sizeScale]);

  const current = cards[currentIndex];

  useEffect(() => {
    if (!current) return;
    fetch(`/api/mind-cards/${current.id}/comments`)
      .then((r) => r.json())
      .then((d) => setCommentCount(d.totalCount ?? 0))
      .catch(() => {});
  }, [current?.id]);

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
    setDetailOpen(true);
  };

  const handleDragEnd = (_e: PointerEvent, info: PanInfo) => {
    const refWidth = layout?.cardW ?? 1;
    const offsetRatio = info.offset.x / refWidth;
    didDragRef.current = Math.abs(info.offset.x) > 5;

    let direction: 1 | -1 | 0 = 0;
    if (offsetRatio < -DRAG_COMMIT_RATIO || info.velocity.x < -FLICK_VELOCITY) direction = 1;
    else if (offsetRatio > DRAG_COMMIT_RATIO || info.velocity.x > FLICK_VELOCITY) direction = -1;

    if (direction !== 0) goTo(currentIndex + direction);
    animate(dragX, 0, SLIDE_TRANSITION);
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goTo(currentIndex - 1);
      else if (e.key === 'ArrowRight') goTo(currentIndex + 1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, cards.length]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      if (wheelLockedRef.current) return;
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(delta) < WHEEL_THRESHOLD) return;
      wheelLockedRef.current = true;
      goTo(currentIndex + (delta > 0 ? 1 : -1));
      setTimeout(() => { wheelLockedRef.current = false; }, WHEEL_COOLDOWN_MS);
    };
    el.addEventListener('wheel', handleWheel, { passive: true });
    return () => el.removeEventListener('wheel', handleWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, cards.length]);

  const exportAsImage = async () => {
    if (!currentCardRef.current || exporting) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(currentCardRef.current, { backgroundColor: null, scale: 2, useCORS: true });
      const link = document.createElement('a');
      link.download = `mindcard-${current?.id}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('[MindCardCarousel] export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  // 只渲染当前及左右各一张。位置用"跟currentIndex的相对偏移量"计算，配合每张卡片
  // 各自独立的x/y/scale/opacity动画属性（不是靠left百分比），不管是拖拽、点击、
  // 键盘还是滚轮触发切换，同一张卡片（靠key保持身份）都会从它当前的视觉位置
  // 平滑过渡到新的目标位置。
  const windowCards = [-1, 0, 1]
    .map((offset) => ({ offset, card: cards[currentIndex + offset] }))
    .filter((s) => s.card);

  if (!current || !layout) {
    return <div ref={wrapperRef} className="flex flex-col items-center justify-center" style={{ height: '100%', width: '100%' }} />;
  }

  return (
    <>
      <div ref={wrapperRef} className="flex flex-col items-center justify-center" style={{ height: '100%', width: '100%' }}>
        <div ref={trackRef} className="relative flex-shrink-0" style={{ width: '100%', height: layout.cardH }}>
          <motion.div
            className="absolute inset-0"
            style={{ x: dragX }}
            drag="x"
            dragElastic={0.15}
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={handleDragEnd}
          >
            {windowCards.map(({ offset, card }) => {
              const isCurrent = offset === 0;
              return (
                <motion.div
                  key={card!.id}
                  className="absolute top-0 rounded-2xl overflow-hidden cursor-pointer"
                  style={{
                    width: layout.cardW,
                    height: layout.cardH,
                    left: '50%',
                    marginLeft: -layout.cardW / 2,
                    border: '1px solid hsl(var(--border))',
                    zIndex: isCurrent ? 2 : 1,
                  }}
                  initial={enterTransform(offset, layout.cardW)}
                  animate={restingTransform(offset, layout.cardW)}
                  transition={SLIDE_TRANSITION}
                  onClick={() => (isCurrent ? openCurrent() : step(offset > 0 ? 1 : -1))}
                >
                  <MindCardBody
                    ref={isCurrent ? currentCardRef : undefined}
                    style={card!.style}
                    className="w-full h-full"
                    clipped
                  />
                </motion.div>
              );
            })}
          </motion.div>
        </div>

        {/* 收藏/留言/分享：卡片外面、正下方独立一行，宽度直接用JS测量出来的
            卡片实际像素宽度（layout.cardW），保证跟卡片严丝合缝对齐。showActions=false
            时（卡片集"明信片"模式复用这个轮播）不需要这条交互栏。
            五格justify-around布局（两头用不可见占位补齐），跟详情弹窗的按钮栏
            是同一套间距逻辑——详情弹窗里可见度/删除只在自己的卡片上出现，不是
            自己的卡片时两头留空但位置照占着，收藏/留言/分享因此实际落在中间
            三格；这里两头永远留空，保证两处的收藏/留言/分享在视觉上是同一个
            水平节奏，不是浏览态贴边、详情页居中两套不同分布。 */}
        {showActions && (
          <div
            className="flex items-center justify-around mt-2 flex-shrink-0"
            style={{ width: layout.cardW }}
          >
            <span />
            <button type="button" onClick={() => setFolderPickerOpen(true)} style={{ color: 'hsl(var(--foreground))' }}>
              <Bookmark size={18} fill={current.favorited ? 'currentColor' : 'none'} />
            </button>
            <button
              type="button"
              onClick={() => setCommentPopoverOpen(true)}
              className="flex items-center gap-1"
              style={{ color: 'hsl(var(--foreground))' }}
            >
              <MessageSquareMore size={18} />
              {commentCount > 0 && <span className="text-xs">{commentCount}</span>}
            </button>
            <button type="button" onClick={exportAsImage} disabled={exporting} style={{ color: 'hsl(var(--foreground))', opacity: exporting ? 0.5 : 1 }}>
              <SquareArrowOutUpRight size={18} />
            </button>
            <span />
          </div>
        )}
      </div>

      {showActions && (
        <>
          <FolderMultiSelectPopover
            open={folderPickerOpen}
            cardId={current.id}
            onClose={() => setFolderPickerOpen(false)}
            onFavoritedChange={(favorited) => onFavoritedChange(current.id, favorited)}
          />
          <MindCardCommentModal
            cardId={current.id}
            vertical={current.style?.card?.vertical ?? false}
            open={commentPopoverOpen}
            onClose={() => setCommentPopoverOpen(false)}
            onCountChange={setCommentCount}
          />
        </>
      )}

      <MindCardDetailModal
        open={detailOpen}
        card={current}
        onClose={() => setDetailOpen(false)}
        onFavoritedChange={onFavoritedChange}
      />
    </>
  );
}