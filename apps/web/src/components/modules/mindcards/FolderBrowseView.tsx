'use client';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronsRight, ChevronsLeft, Pencil, Trash2 } from 'lucide-react';
import MindCardBody from './MindCardBody';
import MindCardDetailModal from './MindCardDetailModal';
import MindCardCarousel, { type MindCard } from './MindCardCarousel';
import { resolveCardFontFamilyCss } from '@/lib/mindCards/fontCatalog';
import type { FolderVisibility } from './MindCardFolderEditSheet';

interface FolderBrowseViewProps {
  folderId: string;
  folderName: string;
  description?: string | null;
  visibility: FolderVisibility;
  isDefault: boolean;
  // 'notebook'（本）固定使用左卡片右批语的布局，不看displayMode——folder_kind
  // 和display_mode是两个独立字段，不要混在一起判断。传'collection'时才会看
  // displayMode决定album/stack哪种网格/轮播。
  folderKind: 'collection' | 'notebook';
  displayMode: 'album' | 'stack';
  isOwn: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const ALBUM_PAGE_SIZE = 4;
const ALBUM_GRID_GAP_PX = 12;
// 收藏册内容区留白/翻页按钮预留空间——这几个数字跟下面JSX里实际用到的内联样式
// 是同一份，不再用Tailwind的px-10/py-4/gap-4这类类名（那样JS算的时候只能凭猜测
// 换算成像素，容易跟实际渲染出来的留白对不上，导致算出来的卡片比真正能装下的
// 大一圈）。
const ALBUM_CONTENT_PADDING_PX = 24;
const ALBUM_ROW_GAP_PX = 16;
const ALBUM_PAGER_HEIGHT_PX = 28;
const SLIDE_TRANSITION = { type: 'spring', stiffness: 300, damping: 32 } as const;
// 细长胶囊提示条的尺寸——图标本身完全不变形，"长"这个视觉效果由胶囊形状承担
const HINT_PILL_WIDTH_PX = 22;
const HINT_PILL_HEIGHT_PX = 120;
// "本"每一条：左边卡片缩略图固定尺寸（3:4），右边批语文字
const NOTEBOOK_THUMB_WIDTH_PX = 72;
const NOTEBOOK_THUMB_HEIGHT_PX = (NOTEBOOK_THUMB_WIDTH_PX * 4) / 3;

type Screen = 'info' | 'content';

function EdgeHint({ direction, onClick }: { direction: 'left' | 'right'; onClick: () => void }) {
  const Icon = direction === 'right' ? ChevronsRight : ChevronsLeft;
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute flex items-center justify-center"
      style={{
        [direction]: 8,
        top: '50%',
        transform: 'translateY(-50%)',
      }}
    >
      <span
        className="flex items-center justify-center"
        style={{
          width: HINT_PILL_WIDTH_PX,
          height: HINT_PILL_HEIGHT_PX,
          borderRadius: HINT_PILL_WIDTH_PX / 2,
          background: 'hsl(var(--foreground) / 0.06)',
        }}
      >
        <Icon size={16} style={{ color: 'hsl(var(--foreground) / 0.55)' }} />
      </span>
    </button>
  );
}

export default function FolderBrowseView({
  folderId, folderName, description, visibility, isDefault, folderKind, displayMode, isOwn,
  onClose, onEdit, onDelete,
}: FolderBrowseViewProps) {
  const t = useTranslations('mindcards');
  const [cards, setCards] = useState<MindCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState<Screen>('info');
  const [page, setPage] = useState(0);
  const [stackIndex, setStackIndex] = useState(0);
  const [detailCard, setDetailCard] = useState<MindCard | null>(null);

  // 单独用一个不参与滑动动画的容器测量可用高度，不再透过会做位移动画的轨道
  // 去量——"透过一个正在变化中的元素测量它子元素尺寸"这类写法这次对话里
  // 反复踩过坑，换成从一个稳定不动的容器直接量，结果作为明确的像素数字往下传。
  const contentAreaRef = useRef<HTMLDivElement>(null);
  const [contentAreaH, setContentAreaH] = useState(0);

  useEffect(() => {
    const el = contentAreaRef.current;
    if (!el) return;
    const compute = () => setContentAreaH(el.clientHeight);
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const albumWrapperRef = useRef<HTMLDivElement>(null);
  const [albumCardSize, setAlbumCardSize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    if (screen !== 'content' || folderKind !== 'collection' || displayMode !== 'album') return;
    const el = albumWrapperRef.current;
    if (!el) return;
    const compute = () => {
      const totalPagesNow = Math.max(1, Math.ceil(cards.length / ALBUM_PAGE_SIZE));
      const pagerReserve = totalPagesNow > 1 ? (ALBUM_PAGER_HEIGHT_PX + ALBUM_ROW_GAP_PX) : 0;

      const availW = el.clientWidth - ALBUM_CONTENT_PADDING_PX * 2;
      const availH = el.clientHeight - ALBUM_CONTENT_PADDING_PX * 2 - pagerReserve;
      if (availW <= 0 || availH <= 0) return;

      let cardW = (availW - ALBUM_GRID_GAP_PX) / 2;
      let cardH = (cardW * 4) / 3;

      const totalHIfWidthBound = cardH * 2 + ALBUM_GRID_GAP_PX;
      if (totalHIfWidthBound > availH) {
        cardH = (availH - ALBUM_GRID_GAP_PX) / 2;
        cardW = (cardH * 3) / 4;
      }

      setAlbumCardSize({ w: cardW, h: cardH });
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [screen, folderKind, displayMode, contentAreaH, cards.length]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/mind-cards/folders/${folderId}/cards`)
      .then((r) => r.json())
      .then((d) => setCards(d.cards ?? []))
      .finally(() => setLoading(false));
  }, [folderId]);

  const handleFavoritedChange = (id: string, favorited: boolean) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, favorited } : c)));
  };
  const syncVisibilityLocally = (id: string, v: string) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, visibility: v } : c)));
  };
  const removeCardLocally = (id: string) => {
    setCards((prev) => prev.filter((c) => c.id !== id));
  };

  const totalPages = Math.max(1, Math.ceil(cards.length / ALBUM_PAGE_SIZE));

  return (
    <div className="fixed inset-0 z-40 flex flex-col" style={{ background: 'hsl(var(--background))' }}>
      {/* 编辑/删除挪进这一栏，跟返回键平行显示，不再单独浮在信息页内容区域里 */}
      <div className="flex items-center justify-between px-4 py-4 flex-shrink-0">
        <button type="button" onClick={onClose} style={{ color: 'hsl(var(--foreground))' }}>
          <ChevronLeft size={22} />
        </button>
        <span className="text-sm" style={{ color: 'hsl(var(--foreground))' }}>
          {screen === 'content' ? folderName : ''}
        </span>
        {isOwn ? (
          <div className="flex items-center gap-3">
            <button type="button" onClick={onEdit} style={{ color: 'hsl(var(--foreground))' }}>
              <Pencil size={16} />
            </button>
            {!isDefault && (
              <button type="button" onClick={onDelete} style={{ color: '#FF3B30' }}>
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ) : (
          <span style={{ width: 22 }} />
        )}
      </div>

      <div ref={contentAreaRef} className="relative flex-1 min-h-0 overflow-hidden">
        {contentAreaH > 0 && (
          <motion.div
            className="flex"
            style={{ width: '200%', height: contentAreaH }}
            animate={{ x: screen === 'info' ? '0%' : '-50%' }}
            transition={SLIDE_TRANSITION}
          >
            {/* 信息页 */}
            <div className="relative" style={{ width: '50%', height: contentAreaH }}>
              <div
                className="absolute left-0 right-0 flex flex-col items-center text-center px-10"
                style={{ top: '38%', transform: 'translateY(-50%)' }}
              >
                <h1
                  className="text-xl"
                  style={{ color: 'hsl(var(--foreground))', fontFamily: resolveCardFontFamilyCss({}) }}
                >
                  {folderName}
                </h1>
                {description && (
                  <p
                    className="text-xs mt-6"
                    style={{
                      color: 'hsl(var(--muted-foreground))',
                      fontFamily: resolveCardFontFamilyCss({}),
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {description}
                  </p>
                )}
              </div>

              <div className="absolute left-0 right-0 flex justify-center" style={{ bottom: '16%' }}>
                <span className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  {t(`folderVisibility.${visibility}`)}
                </span>
              </div>

              {!loading && <EdgeHint direction="right" onClick={() => setScreen('content')} />}
            </div>

            {/* 内容页 */}
            <div className="relative" style={{ width: '50%', height: contentAreaH }}>
              <EdgeHint direction="left" onClick={() => setScreen('info')} />

              {loading && (
                <p className="text-center text-sm py-8" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('folders.loading')}</p>
              )}

              {!loading && cards.length === 0 && (
                <p className="text-center text-sm py-8" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('empty')}</p>
              )}

              {!loading && cards.length > 0 && folderKind === 'notebook' && (
                <div
                  className="overflow-y-auto"
                  style={{ width: '100%', height: contentAreaH, padding: ALBUM_CONTENT_PADDING_PX, boxSizing: 'border-box' }}
                >
                  <div className="flex flex-col" style={{ gap: ALBUM_ROW_GAP_PX }}>
                    {cards.map((c) => (
                      <div key={c.id} className="flex items-start gap-3 flex-shrink-0">
                        <div
                          className="rounded-lg overflow-hidden flex-shrink-0"
                          style={{
                            width: NOTEBOOK_THUMB_WIDTH_PX,
                            height: NOTEBOOK_THUMB_HEIGHT_PX,
                            border: '1px solid hsl(var(--border))',
                          }}
                        >
                          <MindCardBody style={c.style} className="w-full h-full" clipped onClick={() => setDetailCard(c)} />
                        </div>
                        {/* 批语目前只读展示——"编辑批语"这个交互本次不实现，已知缺口 */}
                        {c.annotation && (
                          <p
                            className="text-sm flex-1 pt-1"
                            style={{ color: 'hsl(var(--foreground))', whiteSpace: 'pre-wrap' }}
                          >
                            {c.annotation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!loading && cards.length > 0 && folderKind === 'collection' && displayMode === 'album' && (
                <div
                  ref={albumWrapperRef}
                  className="flex flex-col items-center justify-center"
                  style={{
                    width: '100%',
                    height: contentAreaH,
                    padding: ALBUM_CONTENT_PADDING_PX,
                    boxSizing: 'border-box',
                    gap: ALBUM_ROW_GAP_PX,
                  }}
                >
                  {albumCardSize && (
                    <div className="grid grid-cols-2 flex-shrink-0" style={{ gap: ALBUM_GRID_GAP_PX }}>
                      {Array.from({ length: ALBUM_PAGE_SIZE }).map((_, i) => {
                        const c = cards[page * ALBUM_PAGE_SIZE + i];
                        if (!c) {
                          // 占位：不够4张时，剩下的格子用看不见的占位撑住，保证2x2的
                          // 整体轮廓永远不会因为这一页卡片数量不足而跟着缩水变形。
                          return (
                            <div
                              key={`placeholder-${i}`}
                              style={{ width: albumCardSize.w, height: albumCardSize.h, visibility: 'hidden' }}
                            />
                          );
                        }
                        return (
                          <div
                            key={c.id}
                            className="rounded-xl overflow-hidden"
                            style={{ width: albumCardSize.w, height: albumCardSize.h, border: '1px solid hsl(var(--border))' }}
                          >
                            <MindCardBody style={c.style} className="w-full h-full" clipped onClick={() => setDetailCard(c)} />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {totalPages > 1 && (
                    <div
                      className="flex items-center gap-4 flex-shrink-0"
                      style={{ height: ALBUM_PAGER_HEIGHT_PX }}
                    >
                      <button
                        type="button"
                        disabled={page === 0}
                        onClick={() => setPage((p) => p - 1)}
                        style={{ color: 'hsl(var(--foreground))', opacity: page === 0 ? 0.3 : 1 }}
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <span className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>{page + 1} / {totalPages}</span>
                      <button
                        type="button"
                        disabled={page >= totalPages - 1}
                        onClick={() => setPage((p) => p + 1)}
                        style={{ color: 'hsl(var(--foreground))', opacity: page >= totalPages - 1 ? 0.3 : 1 }}
                      >
                        <ChevronLeft size={20} style={{ transform: 'scaleX(-1)' }} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {!loading && cards.length > 0 && folderKind === 'collection' && displayMode === 'stack' && (
                <div className="px-4 pb-4" style={{ width: '100%', height: contentAreaH }}>
                  <MindCardCarousel
                    cards={cards}
                    currentIndex={stackIndex}
                    onIndexChange={setStackIndex}
                    onFavoritedChange={handleFavoritedChange}
                    showActions={false}
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {detailCard && (
        <MindCardDetailModal
          open
          card={detailCard}
          onClose={() => setDetailCard(null)}
          onFavoritedChange={handleFavoritedChange}
          onVisibilityChange={syncVisibilityLocally}
          onDeleted={removeCardLocally}
        />
      )}
    </div>
  );
}