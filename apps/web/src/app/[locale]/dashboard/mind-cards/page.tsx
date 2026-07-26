'use client';
import '@/styles/mind-fonts.module.css';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { ChevronLeft } from 'lucide-react';
import MindCardCarousel, { type MindCard } from '@/components/modules/mindcards/MindCardCarousel';
import MindCardsArcMenu from '@/components/modules/mindcards/MindCardsArcMenu';
import MindCardNotificationPanel from '@/components/modules/mindcards/MindCardNotificationPanel';

const PREFETCH_LOOKAHEAD = 3;
// 圆弧菜单栏自身的固定高度——这是UI chrome本身的既定尺寸，不属于"要跨设备动态适配"的
// 那部分（卡片区域才是），继续保留这个常量只是用来给底部预留出对应的占位空间，避免
// 内容被固定定位的菜单栏遮住。
const ARC_MENU_RESERVED_PX = 96;

// 按id去重，只保留每个id第一次出现的那份，后出现的丢弃。不管是候选卡片数量太少
// 触发了连续两次预取、还是别的什么时序原因导致同一张卡片被读到了两次，最终真正
// 塞进列表state的这一步统一做一次兜底去重，保证渲染时不会出现重复key。
function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

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

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // 未读数在页面挂载时拉一次即可——不做轮询，打开提醒面板时会再刷新一次
  // 真实数据，这里只负责给Bell图标提供一个"大概有没有新东西"的初始信号。
  useEffect(() => {
    fetch('/api/mind-cards/notifications')
      .then((r) => r.json())
      .then((d) => setUnreadCount(d.unreadCount ?? 0))
      .catch(() => {});
  }, []);

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
        setCards(dedupeById(d.cards ?? []));
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
          if (fresh.length > 0) setCards((prev) => dedupeById([...prev, ...fresh]));
        })
        .finally(() => { fetchingMoreRef.current = false; });
    } else if (nextCursor) {
      fetchingMoreRef.current = true;
      fetch(`/api/mind-cards/following?cursor=${encodeURIComponent(nextCursor)}`)
        .then((r) => r.json())
        .then((d) => {
          setCards((prev) => dedupeById([...prev, ...(d.cards ?? [])]));
          setNextCursor(d.nextCursor ?? null);
        })
        .finally(() => { fetchingMoreRef.current = false; });
    }
  }, [tab, currentIndex, cards, nextCursor]);

  // 具体的入夹/移出请求由FolderMultiSelectPopover自己发起（每次勾选即生效），
  // 这里只负责把最终"是否已收藏"的结果同步回卡片列表，驱动书签图标的点亮态
  const handleFavoritedChange = (id: string, favorited: boolean) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, favorited } : c)));
  };

  return (
    // 用100dvh（动态视口高度，比100vh更适合移动端——不受浏览器地址栏收起/展开时
    // 视口高度变化的影响）作为整个页面的高度基准，配合下面flex-1区域，让"卡片该多大"
    // 这件事完全交给浏览器在每台设备上各自实时计算，不写死任何具体像素数字。
    <div className="w-full flex flex-col" style={{ height: '100dvh' }}>
      {/* 页面已经搬出(os)路由组，不再继承Dock导航栏，顶部需要自己的返回按钮。
          返回键固定贴左上角，"推荐/关注"整体独立居中——两者用各自独立的定位方式，
          不写在同一个flex row里互相牵制位置。 */}
      <div className="relative w-full max-w-xl mx-auto flex-shrink-0" style={{ height: 44, marginTop: 12 }}>
        <button
          type="button"
          onClick={() => router.back()}
          className="absolute left-4"
          style={{ top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--foreground))' }}
        >
          <ChevronLeft size={20} />
        </button>
        <div className="h-full flex items-center justify-center gap-2">
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
      </div>

      {/* 卡片轮播区域：flex-1吸收"减去顶部返回/切换栏、减去底部菜单栏预留空间"之后
          剩下的全部可用高度，不写死任何具体像素——不同设备屏幕高度不同，这块区域的
          实际大小由浏览器在每台设备上各自实时计算，保证任何屏幕尺寸下都恰好铺满
          剩余空间。min-h-0是flex子项的标准写法，避免默认的min-height:auto把布局撑破。
          卡片本身的实际尺寸计算交给MindCardCarousel内部处理（height:100%+aspect-ratio），
          这里只负责把"剩下多少可用高度"这个信息通过flex布局传递下去。 */}
      <div className="flex-1 min-h-0 w-full max-w-xl mx-auto px-4 flex items-center justify-center">
        {!loading && cards.length === 0 && (
          <p className="text-sm text-center" style={{ color: 'hsl(var(--muted-foreground))' }}>
            {t('empty')}
          </p>
        )}

        {cards.length > 0 && (
          <MindCardCarousel
            cards={cards}
            currentIndex={currentIndex}
            onIndexChange={setCurrentIndex}
            onFavoritedChange={handleFavoritedChange}
            // 主浏览页固定占着顶部栏+底部菜单栏的空间，能用的高度预算比卡片集
            // 详情页（全屏独占，没有常驻底部菜单栏）小不少。同样的缩放比例，
            // 折之前的基数不一样大，折出来的结果也不会一样大——单独调高这个
            // 比例弥补先天空间差距，卡片集那边保持默认0.7不用动。
            sizeScale={0.85}
          />
        )}
      </div>

      <div style={{ flexShrink: 0, height: ARC_MENU_RESERVED_PX }} />

      <MindCardsArcMenu
        onPublish={() => router.push('/dashboard/mind-cards/compose')}
        onOpenProfile={() => router.push('/dashboard/mind-cards/profile')}
        onOpenNotifications={() => setNotificationsOpen(true)}
        unreadCount={unreadCount}
      />

      <MindCardNotificationPanel
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        onReadAll={() => setUnreadCount(0)}
      />
    </div>
  );
}