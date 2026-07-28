'use client';
import '@/styles/mind-fonts.module.css';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { ChevronLeft } from 'lucide-react';
import { useInfiniteQuery, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import MindCardCarousel, { type MindCard } from '@/components/modules/mindcards/MindCardCarousel';
import MindCardsArcMenu from '@/components/modules/mindcards/MindCardsArcMenu';
import MindCardNotificationPanel from '@/components/modules/mindcards/MindCardNotificationPanel';
import { notificationsQueryKey, fetchNotifications } from '@/components/modules/mindcards/MindCardNotificationPanel';
import { useMindCardsMe } from '@/hooks/queries/useMindCardsMe';

const PREFETCH_LOOKAHEAD = 3;
// 圆弧菜单栏自身的固定高度——这是UI chrome本身的既定尺寸，不属于"要跨设备动态适配"的
// 那部分（卡片区域才是），继续保留这个常量只是用来给底部预留出对应的占位空间，避免
// 内容被固定定位的菜单栏遮住。
const ARC_MENU_RESERVED_PX = 96;

type FeedTab = 'following' | 'recommend';

interface FeedPage {
  cards: MindCard[];
  nextCursor: string | null;
}

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

function feedQueryKey(tab: FeedTab) {
  return ['mind-cards-feed', tab] as const;
}

async function fetchFeedPage(tab: FeedTab, cursor: string | null): Promise<FeedPage> {
  if (tab === 'following') {
    const url = cursor ? `/api/mind-cards/following?cursor=${encodeURIComponent(cursor)}` : '/api/mind-cards/following';
    const res = await fetch(url);
    return res.json();
  }
  // 推荐tab没有游标概念——每次调用都是四条线各自现选一批，拼成新的一组，
  // 靠去重保证不会跟已经拉过的卡片重复展示。
  const res = await fetch('/api/mind-cards/recommend');
  const d = await res.json();
  return { cards: d.cards ?? [], nextCursor: null };
}

export default function MindCardsPage() {
  const t = useTranslations('mindcards');
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<FeedTab>('recommend');
  const [currentIndex, setCurrentIndex] = useState(0);

  const viewedRef = useRef<Set<string>>(new Set());

  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const { data: me } = useMindCardsMe();

  // 未读数——跟MindCardNotificationPanel共用同一份/api/mind-cards/notifications
  // 缓存，面板打开时标记已读会直接把这份缓存的unreadCount清零，Bell上的红点
  // 自动跟着消失，不需要额外的回调。
  const { data: notificationsData } = useQuery({
    queryKey: notificationsQueryKey(),
    queryFn: fetchNotifications,
  });
  const unreadCount = notificationsData?.unreadCount ?? 0;

  const feedQuery = useInfiniteQuery({
    queryKey: feedQueryKey(tab),
    queryFn: ({ pageParam }) => fetchFeedPage(tab, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage, allPages) => {
      if (tab === 'following') return lastPage.nextCursor ?? undefined;
      // 推荐tab没有游标，"还有没有更多"不能只看"这次接口有没有返回东西"——
      // 推荐算法每次独立选卡，不知道之前已经拉过什么，很容易连续几次返回的
      // 全是已经见过的重复卡片，如果只看"返回数量>0"就判定"还有更多"，会陷入
      // "接口一直有返回、但过滤重复后实际新增几乎为0"的死循环，请求会不停
      // 发出去。改成：这次返回的卡片里，只要有哪怕一张是之前所有页里都没
      // 出现过的全新卡片，才认为"还有更多"；如果这次全是重复的，就此打住。
      const earlierPages = allPages.slice(0, -1);
      const seenIds = new Set(earlierPages.flatMap((p) => p.cards.map((c) => c.id)));
      const hasNewCard = (lastPage.cards ?? []).some((c) => !seenIds.has(c.id));
      return hasNewCard ? 'more' : undefined;
    },
  });

  const cards = dedupeById((feedQuery.data?.pages ?? []).flatMap((p) => p.cards ?? []));

  // 切换tab：回到第一张，已读记录清空重来
  useEffect(() => {
    setCurrentIndex(0);
    viewedRef.current = new Set();
  }, [tab]);

  // 进个人页——现在自己和别人共用同一套handle网址，不再有一个"没有handle"
  // 的特殊路径，所以这里要先查一下自己的handle，再跳转，不是直接跳一个
  // 写死的地址。
  const goToOwnProfile = () => {
    if (me?.handle) router.push(`/dashboard/mind-cards/profile/${me.handle}`);
  };

  // 已读标记：来到即已读，包括首张卡片在mount时就触发
  useEffect(() => {
    if (tab !== 'recommend') return;
    const card = cards[currentIndex];
    if (!card || viewedRef.current.has(card.id)) return;
    viewedRef.current.add(card.id);
    fetch(`/api/mind-cards/${card.id}/view`, { method: 'POST' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, cards, currentIndex]);

  // 候选池快耗尽前无缝预取下一批
  useEffect(() => {
    if (feedQuery.isFetchingNextPage || !feedQuery.hasNextPage) return;
    if (currentIndex < cards.length - PREFETCH_LOOKAHEAD) return;
    feedQuery.fetchNextPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, cards.length, feedQuery.hasNextPage, feedQuery.isFetchingNextPage]);

  // 具体的入夹/移出请求由FolderMultiSelectPopover自己发起（每次勾选即生效），
  // 这里只负责把最终"是否已收藏"的结果同步回卡片列表，驱动书签图标的点亮态
  const handleFavoritedChange = (id: string, favorited: boolean) => {
    queryClient.setQueryData(feedQueryKey(tab), (old: InfiniteData<FeedPage> | undefined) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          cards: page.cards.map((c) => (c.id === id ? { ...c, favorited } : c)),
        })),
      };
    });
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
        {!feedQuery.isLoading && cards.length === 0 && (
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
        onOpenProfile={goToOwnProfile}
        onOpenNotifications={() => setNotificationsOpen(true)}
        unreadCount={unreadCount}
      />

      <MindCardNotificationPanel
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />
    </div>
  );
}