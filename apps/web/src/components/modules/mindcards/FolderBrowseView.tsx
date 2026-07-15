'use client';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import MindCardBody from './MindCardBody';
import MindCardDetailModal from './MindCardDetailModal';
import type { MindCard } from './MindCardCarousel';

interface FolderBrowseViewProps {
  folderId: string;
  folderName: string;
  description?: string | null;
  displayMode: 'album' | 'stack';
  onClose: () => void;
}

const ALBUM_PAGE_SIZE = 4;

export default function FolderBrowseView({
  folderId, folderName, description, displayMode, onClose,
}: FolderBrowseViewProps) {
  const t = useTranslations('mindcards');
  const [cards, setCards] = useState<MindCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0); // album模式：0=封面页，1..N=内容页
  const [detailCard, setDetailCard] = useState<MindCard | null>(null);

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

  const totalPages = Math.ceil(cards.length / ALBUM_PAGE_SIZE);

  return (
    <div className="fixed inset-0 z-40 flex flex-col" style={{ background: 'hsl(var(--background))' }}>
      <div className="flex items-center justify-between px-4 py-4 flex-shrink-0">
        <button type="button" onClick={onClose} style={{ color: 'hsl(var(--foreground))' }}>
          <ChevronLeft size={22} />
        </button>
        <span className="text-sm" style={{ color: 'hsl(var(--foreground))' }}>{folderName}</span>
        <span style={{ width: 22 }} />
      </div>

      {loading && (
        <p className="text-center text-sm py-8" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('folders.loading')}</p>
      )}

      {!loading && cards.length === 0 && (
        <p className="text-center text-sm py-8" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('empty')}</p>
      )}

      {!loading && cards.length > 0 && displayMode === 'album' && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4 overflow-hidden">
          {page === 0 ? (
            <div className="text-center space-y-3 max-w-xs">
              <h2 className="text-xl" style={{ color: 'hsl(var(--foreground))' }}>{folderName}</h2>
              {description && (
                <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>{description}</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 w-full max-w-xl">
              {cards.slice((page - 1) * ALBUM_PAGE_SIZE, page * ALBUM_PAGE_SIZE).map((c) => (
                <div
                  key={c.id}
                  className="rounded-xl overflow-hidden"
                  style={{ aspectRatio: '3 / 4', border: '1px solid hsl(var(--border))' }}
                >
                  <MindCardBody style={c.style} className="w-full h-full" clipped onClick={() => setDetailCard(c)} />
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-4">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              style={{ color: 'hsl(var(--foreground))', opacity: page === 0 ? 0.3 : 1 }}
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>{page} / {totalPages}</span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              style={{ color: 'hsl(var(--foreground))', opacity: page >= totalPages ? 0.3 : 1 }}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}

      {!loading && cards.length > 0 && displayMode === 'stack' && (
        <StackScroller cards={cards} onOpen={setDetailCard} />
      )}

      {detailCard && (
        <MindCardDetailModal
          open
          card={detailCard}
          onClose={() => setDetailCard(null)}
          onFavoritedChange={handleFavoritedChange}
        />
      )}
    </div>
  );
}

// 集子型：叠放效果，进入即显示第一张，向下滚动逐张飞开，回滚逐张飞回——完全由
// scrollYProgress派生的useTransform驱动，天然可逆，不是一次性播放的动画。
function StackScroller({ cards, onOpen }: { cards: MindCard[]; onOpen: (c: MindCard) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cardHeight, setCardHeight] = useState(0);
  const { scrollYProgress } = useScroll({ container: containerRef });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setCardHeight(el.clientHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto relative">
      <div style={{ height: cardHeight * cards.length }} className="relative">
        {cards.map((c, i) => (
          <StackCard
            key={c.id}
            index={i}
            total={cards.length}
            progress={scrollYProgress}
            card={c}
            cardHeight={cardHeight}
            onOpen={() => onOpen(c)}
          />
        ))}
      </div>
    </div>
  );
}

function StackCard({ index, total, progress, card, cardHeight, onOpen }: {
  index: number;
  total: number;
  progress: MotionValue<number>;
  card: MindCard;
  cardHeight: number;
  onOpen: () => void;
}) {
  const start = index / total;
  const end = (index + 1) / total;
  const y = useTransform(progress, [start, end], [0, -cardHeight * 1.1]);
  const opacity = useTransform(progress, [start, end], [1, 0]);
  const scale = useTransform(progress, [start, end], [1, 0.9]);

  return (
    <motion.div
      className="sticky top-0 flex items-center justify-center"
      style={{ height: cardHeight || undefined, y, opacity, scale, zIndex: total - index }}
    >
      <div
        className="rounded-2xl overflow-hidden cursor-pointer"
        style={{ width: 'min(80vw, 320px)', aspectRatio: '3 / 4', border: '1px solid hsl(var(--border))' }}
        onClick={onOpen}
      >
        <MindCardBody style={card.style} className="w-full h-full" clipped />
      </div>
    </motion.div>
  );
}
