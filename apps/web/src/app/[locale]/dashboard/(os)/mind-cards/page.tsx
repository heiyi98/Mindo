'use client';
import '@/styles/mind-fonts.module.css';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import MindCardCarousel, { type MindCard } from '@/components/modules/mindcards/MindCardCarousel';
import MindCardsArcMenu from '@/components/modules/mindcards/MindCardsArcMenu';

const PREFETCH_LOOKAHEAD = 3;
const ARC_MENU_HEIGHT = 84;

export default function MindCardsPage() {
  const t = useTranslations('mindcards');
  const router = useRouter();
  const [tab, setTab] = useState<'following' | 'recommend'>('recommend');
  const [cards, setCards] = useState<MindCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const fetchingMoreRef = useRef(false);
  const viewedRef = useRef<Set<string>>(new Set());

  const loadFeed = useCallback((activeTab: 'following' | 'recommend') => {
    setLoading(true);
    setCards([]);
    setCurrentIndex(0);
    setNextCursor(null);
    viewedRef.current = new Set();
    const url = activeTab === 'following' ? '/api/mind-cards/following' : '/api/mind-cards/recommend';
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        setCards(d.cards ?? []);
        setNextCursor(d.nextCursor ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadFeed(tab);
  }, [tab, loadFeed]);

  // 已读标记：来到即已读，包括首张卡片在mount时就触发
  useEffect(() => {
    if (tab !== 'recommend') return;
    const card = cards[currentIndex];
    if (!card || viewedRef.current.has(card.id)) return;
    viewedRef.current.add(card.id);
    fetch(`/api/mind-cards/${card.id}/view`, { method: 'POST' });
  }, [tab, cards, currentIndex]);

  // 候选池快耗尽前无缝预取下一批
  useEffect(() => {
    if (fetchingMoreRef.current) return;
    if (currentIndex < cards.length - PREFETCH_LOOKAHEAD) return;

    if (tab === 'recommend') {
      fetchingMoreRef.current = true;
      fetch('/api/mind-cards/recommend')
        .then((r) => r.json())
        .then((d) => {
          const existingIds = new Set(cards.map((c) => c.id));
          const fresh: MindCard[] = (d.cards ?? []).filter((c: MindCard) => !existingIds.has(c.id));
          if (fresh.length > 0) setCards((prev) => [...prev, ...fresh]);
        })
        .finally(() => { fetchingMoreRef.current = false; });
    } else if (nextCursor) {
      fetchingMoreRef.current = true;
      fetch(`/api/mind-cards/following?cursor=${encodeURIComponent(nextCursor)}`)
        .then((r) => r.json())
        .then((d) => {
          setCards((prev) => [...prev, ...(d.cards ?? [])]);
          setNextCursor(d.nextCursor ?? null);
        })
        .finally(() => { fetchingMoreRef.current = false; });
    }
  }, [tab, currentIndex, cards, nextCursor]);

  const handleToggleLike = (id: string, liked: boolean) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, liked: !liked } : c)));
    fetch(`/api/mind-cards/${id}/like`, { method: liked ? 'DELETE' : 'POST' });
  };

  // 具体的入夹/移出请求由FolderMultiSelectPopover自己发起（每次勾选即生效），
  // 这里只负责把最终"是否已收藏"的结果同步回卡片列表，驱动书签图标的点亮态
  const handleFavoritedChange = (id: string, favorited: boolean) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, favorited } : c)));
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div
        className="w-full max-w-xl mx-auto px-4 py-6 flex-1 flex flex-col gap-4"
        style={{ paddingBottom: ARC_MENU_HEIGHT + 24 }}
      >
        <div className="flex gap-2">
          {(['recommend', 'following'] as const).map((tabKey) => (
            <button
              key={tabKey}
              onClick={() => setTab(tabKey)}
              className="px-4 py-2 rounded-xl text-sm font-light"
              style={{
                background: tab === tabKey ? 'hsl(var(--foreground) / 0.08)' : 'transparent',
                color: 'hsl(var(--foreground))',
              }}
            >
              {t(`tabs.${tabKey}`)}
            </button>
          ))}
        </div>

        {!loading && cards.length === 0 && (
          <p className="text-sm text-center py-8" style={{ color: 'hsl(var(--muted-foreground))' }}>
            {t('empty')}
          </p>
        )}

        {cards.length > 0 && (
          <MindCardCarousel
            cards={cards}
            currentIndex={currentIndex}
            onIndexChange={setCurrentIndex}
            onToggleLike={handleToggleLike}
            onFavoritedChange={handleFavoritedChange}
          />
        )}
      </div>

      <MindCardsArcMenu
        onPublish={() => router.push('/dashboard/mind-cards/compose')}
        onOpenProfile={() => router.push('/dashboard/mind-cards/profile')}
      />
    </div>
  );
}
