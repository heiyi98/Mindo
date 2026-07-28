'use client';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronLeft, Pencil, Trash2 } from 'lucide-react';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import MindCardBody from './MindCardBody';
import MindCardDetailModal from './MindCardDetailModal';
import MindCardVerticalCarousel from './MindCardVerticalCarousel';
import type { MindCard } from './MindCardCarousel';
import { resolveCardFontFamilyCss } from '@/lib/mindCards/fontCatalog';
import type { FolderVisibility } from './MindCardFolderEditSheet';

interface FolderBrowseViewProps {
  folderId: string;
  folderName: string;
  description?: string | null;
  visibility: FolderVisibility;
  isDefault: boolean;
  folderKind: 'collection' | 'notebook';
  displayMode: 'album' | 'stack';
  isOwn: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

interface ManifestItem {
  card_id: string;
  added_at: string;
  annotation: string | null;
}

interface ManifestResponse {
  items: ManifestItem[];
}

interface ContentPage {
  cards: MindCard[];
  offset: number;
}

const CONTENT_PADDING_PX = 24;
const ROW_GAP_PX = 16;
const GRID_GAP_PX = 12;
const STACK_SIZE_SCALE = 0.7;
const NOTEBOOK_FRAME_PADDING_PX = 20;
const NOTEBOOK_ANNOTATION_FONT_SIZE_PX = 18;

const SCROLL_CHUNK_SIZE = 10;
const BATCH_REQUEST_SIZE = 12;
const STACK_LOOKAHEAD = 4;

function folderManifestQueryKey(folderId: string) {
  return ['mind-card-folder-manifest', folderId] as const;
}
function folderContentQueryKey(folderId: string) {
  return ['mind-card-folder-content', folderId] as const;
}

async function fetchManifest(folderId: string): Promise<ManifestResponse> {
  const res = await fetch(`/api/mind-cards/folders/${folderId}/manifest`);
  if (!res.ok) throw new Error('Failed to fetch manifest');
  const d = await res.json();
  return { items: d.items ?? [] };
}

// 通用batch接口单次最多100个id，这里的BATCH_REQUEST_SIZE(12)是比这更保守的
// 网络请求粒度上限，一次"揭示"的清单切片（SCROLL_CHUNK_SIZE=10 / STACK_LOOKAHEAD=4）
// 本来就在这个上限之内，这里的子分批纯粹是防御性写法，防止以后调大切片粒度时
// 意外撞到接口上限。
async function fetchBatch(ids: string[]): Promise<MindCard[]> {
  const cards: MindCard[] = [];
  for (let i = 0; i < ids.length; i += BATCH_REQUEST_SIZE) {
    const chunk = ids.slice(i, i + BATCH_REQUEST_SIZE);
    const res = await fetch('/api/mind-cards/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: chunk }),
    });
    const d = await res.json();
    cards.push(...(d.cards ?? []));
  }
  return cards;
}

function CardPlaceholder({ width, height }: { width: number | string; height: number | string }) {
  return (
    <div
      className="rounded-xl animate-pulse flex-shrink-0"
      style={{ width, height, background: 'hsl(var(--foreground) / 0.06)' }}
    />
  );
}

export default function FolderBrowseView({
  folderId, folderName, description, visibility, isDefault, folderKind, displayMode, isOwn,
  onClose, onEdit, onDelete,
}: FolderBrowseViewProps) {
  const t = useTranslations('mindcards');
  const queryClient = useQueryClient();

  const isStack = folderKind === 'collection' && displayMode === 'stack';
  // 卡册/本用较大的清单切片（滚动触底驱动），卡夹用较小的切片（索引临近驱动）——
  // 两种揭示节奏不同，沿用原设计的两个常量，只是现在共用同一条useInfiniteQuery。
  const CHUNK_SIZE = isStack ? STACK_LOOKAHEAD : SCROLL_CHUNK_SIZE;

  // 清单：一次性拿到夹内全部卡片的轻量信息（不含content/style），用来知道
  // "总共多少张"、驱动翻页导航，不被具体内容拖慢。
  const manifestQuery = useQuery({
    queryKey: folderManifestQueryKey(folderId),
    queryFn: () => fetchManifest(folderId),
  });
  const manifest = manifestQuery.data?.items ?? null;

  // 内容：按清单顺序分批用batch接口补全，用useInfiniteQuery管理"翻到第几批"、
  // 缓存已加载的批次、避免重复请求。
  const contentQuery = useInfiniteQuery({
    queryKey: folderContentQueryKey(folderId),
    queryFn: async ({ pageParam }) => {
      const ids = (manifest ?? []).slice(pageParam, pageParam + CHUNK_SIZE).map((i) => i.card_id);
      const cards = await fetchBatch(ids);
      return { cards, offset: pageParam } satisfies ContentPage;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const nextOffset = lastPage.offset + CHUNK_SIZE;
      return manifest && nextOffset < manifest.length ? nextOffset : undefined;
    },
    enabled: !!manifest && manifest.length > 0,
  });

  const cardDataById = new Map(
    (contentQuery.data?.pages ?? []).flatMap((p) => p.cards).map((c) => [c.id, c] as const)
  );

  const [detailCard, setDetailCard] = useState<MindCard | null>(null);
  const [stackIndex, setStackIndex] = useState(0);
  // 已"揭示"（该显示骨架占位、该触发对应批次内容请求）的清单条目数——独立于
  // 网络请求是否已经返回，滚动到底/轮播临近末尾的那一刻就立刻推进这个数字，
  // 让占位骨架马上出现在正确的位置，不用等网络往返，内容到位后自然淡入替换。
  const [revealedCount, setRevealedCount] = useState(0);

  const [editingAnnotation, setEditingAnnotation] = useState<{ cardId: string; value: string } | null>(null);

  // 切换文件夹：本地UI状态清空重来（manifest/content两份查询各自按folderId
  // 分别缓存，不需要手动清）
  useEffect(() => {
    setDetailCard(null);
    setStackIndex(0);
    setRevealedCount(0);
    setEditingAnnotation(null);
  }, [folderId]);

  // 清单到位：立刻揭示第一屏该有的骨架数量，不等网络往返
  useEffect(() => {
    if (!manifest) return;
    setRevealedCount((c) => Math.max(c, Math.min(manifest.length, CHUNK_SIZE)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manifest]);

  // 卡夹：索引驱动的轮播，快接近已揭示末尾就提前多揭示一批
  useEffect(() => {
    if (!manifest || !isStack) return;
    setRevealedCount((c) => {
      if (c - stackIndex > STACK_LOOKAHEAD) return c;
      return Math.min(manifest.length, c + STACK_LOOKAHEAD);
    });
  }, [stackIndex, manifest, isStack]);

  // 卡册/本：滚动触底揭示下一批。测量用的ref挂在最外层、始终会渲染的滚动
  // 容器上——不能挂在"要等尺寸算出来才会渲染"的元素上，那样会形成死循环。
  const bottomSentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!manifest || isStack) return;
    const el = bottomSentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting) return;
      setRevealedCount((c) => Math.min(manifest.length, c + SCROLL_CHUNK_SIZE));
    }, { threshold: 0.1 });
    io.observe(el);
    return () => io.disconnect();
  }, [manifest, isStack]);

  // 已揭示的条目数一旦超出已经拉到的批次覆盖范围，就请求下一批——实际的
  // 请求/缓存/去重全部交给useInfiniteQuery，这里只负责"该不该再翻一页"。
  useEffect(() => {
    if (!manifest) return;
    const havePages = contentQuery.data?.pages.length ?? 0;
    const neededPages = Math.ceil(revealedCount / CHUNK_SIZE);
    if (neededPages > havePages && !contentQuery.isFetchingNextPage) {
      contentQuery.fetchNextPage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealedCount, contentQuery.data, contentQuery.isFetchingNextPage, manifest]);

  const updateCardInContent = (id: string, patch: Partial<MindCard>) => {
    queryClient.setQueryData(folderContentQueryKey(folderId), (old: InfiniteData<ContentPage> | undefined) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((p) => ({ ...p, cards: p.cards.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      };
    });
  };
  const handleFavoritedChange = (id: string, favorited: boolean) => updateCardInContent(id, { favorited });
  const syncVisibilityLocally = (id: string, v: string) => updateCardInContent(id, { visibility: v });
  const removeCardLocally = (id: string) => {
    queryClient.setQueryData(folderManifestQueryKey(folderId), (old: ManifestResponse | undefined) =>
      old ? { items: old.items.filter((i) => i.card_id !== id) } : old
    );
    queryClient.setQueryData(folderContentQueryKey(folderId), (old: InfiniteData<ContentPage> | undefined) => {
      if (!old) return old;
      return { ...old, pages: old.pages.map((p) => ({ ...p, cards: p.cards.filter((c) => c.id !== id) })) };
    });
  };

  const saveAnnotationMutation = useMutation({
    mutationFn: async (vars: { cardId: string; value: string }) => {
      const res = await fetch(`/api/mind-cards/${vars.cardId}/folders/${folderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ annotation: vars.value }),
      });
      if (!res.ok) throw new Error('request failed');
    },
    onSuccess: (_data, vars) => {
      queryClient.setQueryData(folderManifestQueryKey(folderId), (old: ManifestResponse | undefined) =>
        old ? { items: old.items.map((i) => (i.card_id === vars.cardId ? { ...i, annotation: vars.value.trim() || null } : i)) } : old
      );
      setEditingAnnotation(null);
    },
  });

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

  // 测量用的ref挂在最外层、始终会渲染的滚动容器上——不能挂在"要等尺寸算出来
  // 才会渲染"的元素上，那样会形成"没渲染出来就量不到、量不到就永远算不出
  // 尺寸"的死循环（卡夹上一版就是踩了这个坑，内容区因此完全空白）。
  const scrollWrapperRef = useRef<HTMLDivElement>(null);
  const [gridCardSize, setGridCardSize] = useState<{ w: number; h: number } | null>(null);
  const [stackCardSize, setStackCardSize] = useState<{ w: number; h: number } | null>(null);
  const [notebookFrame, setNotebookFrame] = useState<{ frameW: number; frameH: number; cardW: number; cardH: number } | null>(null);

  useEffect(() => {
    if (contentAreaH === 0) return;
    const el = scrollWrapperRef.current;
    if (!el) return;
    const compute = () => {
      const availW = el.clientWidth - CONTENT_PADDING_PX * 2;
      if (availW <= 0) return;

      if (folderKind === 'notebook') {
        let frameH = contentAreaH - CONTENT_PADDING_PX * 2;
        let frameW = (frameH * 4) / 3;
        if (frameW > availW) {
          frameW = availW;
          frameH = (frameW * 3) / 4;
        }
        const cardH = frameH - NOTEBOOK_FRAME_PADDING_PX * 2;
        const cardW = (cardH * 3) / 4;
        setNotebookFrame({ frameW, frameH, cardW, cardH });
      } else if (displayMode === 'album') {
        let cardH = (contentAreaH - CONTENT_PADDING_PX * 2 - GRID_GAP_PX) / 2;
        let cardW = (cardH * 3) / 4;
        if (cardW * 2 + GRID_GAP_PX > availW) {
          cardW = (availW - GRID_GAP_PX) / 2;
          cardH = (cardW * 4) / 3;
        }
        setGridCardSize({ w: cardW, h: cardH });
      } else {
        let cardH = contentAreaH * STACK_SIZE_SCALE;
        let cardW = (cardH * 3) / 4;
        if (cardW > availW) {
          cardW = availW;
          cardH = (cardW * 4) / 3;
        }
        setStackCardSize({ w: cardW, h: cardH });
      }
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [contentAreaH, folderKind, displayMode]);

  const visibleItems = (manifest ?? []).slice(0, revealedCount);
  const hasMore = !!manifest && revealedCount < manifest.length;

  const stackCards = (manifest ?? [])
    .slice(0, revealedCount)
    .map((i) => cardDataById.get(i.card_id))
    .filter((c): c is MindCard => !!c);

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'hsl(var(--background))' }}>
      <div className="flex items-center justify-between px-4 py-4 flex-shrink-0">
        <button type="button" onClick={onClose} style={{ color: 'hsl(var(--foreground))' }}>
          <ChevronLeft size={22} />
        </button>
        <span className="text-sm" style={{ color: 'hsl(var(--foreground))' }}>{folderName}</span>
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
          <div
            ref={scrollWrapperRef}
            className="overflow-y-auto"
            style={{ width: '100%', height: contentAreaH }}
          >
            {/* 信息区：占满一页高度，标题偏上、可见度靠下——不再需要点击
                任何箭头，往下滚动自然接上内容。用flex+固定像素间距实现，
                不用百分比定位——百分比换算出来的位置没有"绝对不会被突破"
                的安全距离，简介文字短、或者这一页实际高度矮的时候，容易
                跟紧接在后面的内容挤到一起甚至重叠。这里改成"标题简介固定
                贴顶一段距离、可见度固定贴底一段距离，中间用弹性空白撑开"，
                可见度和下面内容之间永远有一个不会被压缩的安全距离。 */}
            <div className="flex flex-col" style={{ width: '100%', height: contentAreaH, boxSizing: 'border-box' }}>
              <div className="flex flex-col items-center text-center px-10 flex-shrink-0" style={{ paddingTop: '18%' }}>
                <h1 className="text-xl" style={{ color: 'hsl(var(--foreground))', fontFamily: resolveCardFontFamilyCss({}) }}>
                  {folderName}
                </h1>
                {description && (
                  <p
                    className="text-xs mt-6"
                    style={{ color: 'hsl(var(--muted-foreground))', fontFamily: resolveCardFontFamilyCss({}), whiteSpace: 'pre-wrap' }}
                  >
                    {description}
                  </p>
                )}
              </div>
              <div style={{ flex: 1 }} />
              <div className="flex justify-center flex-shrink-0" style={{ paddingBottom: 40 }}>
                <span className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  {t(`folderVisibility.${visibility}`)}
                </span>
              </div>
            </div>

            {manifest === null && (
              <p className="text-center text-sm py-8" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('folders.loading')}</p>
            )}
            {manifest !== null && manifest.length === 0 && (
              <p className="text-center text-sm py-8" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('empty')}</p>
            )}

            {manifest !== null && manifest.length > 0 && (
              <div style={{ padding: CONTENT_PADDING_PX, paddingTop: 0, boxSizing: 'border-box' }}>
                {folderKind === 'notebook' && notebookFrame && (
                  <div className="flex flex-col items-center" style={{ gap: ROW_GAP_PX }}>
                    {visibleItems.map((item) => {
                      const c = cardDataById.get(item.card_id);
                      return (
                        <div
                          key={item.card_id}
                          className="relative flex items-stretch flex-shrink-0"
                          style={{
                            width: notebookFrame.frameW,
                            height: notebookFrame.frameH,
                            border: '1px solid hsl(var(--border))',
                            borderRadius: 16,
                            padding: NOTEBOOK_FRAME_PADDING_PX,
                            boxSizing: 'border-box',
                            gap: NOTEBOOK_FRAME_PADDING_PX,
                          }}
                        >
                          <div
                            className="rounded-lg overflow-hidden flex-shrink-0"
                            style={{
                              width: notebookFrame.cardW,
                              height: notebookFrame.cardH,
                              border: c ? '1px solid hsl(var(--border))' : 'none',
                            }}
                          >
                            {c
                              ? <MindCardBody style={c.style} className="w-full h-full" clipped onClick={() => setDetailCard(c)} />
                              : <CardPlaceholder width={notebookFrame.cardW} height={notebookFrame.cardH} />}
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col justify-center overflow-y-auto pr-6">
                            {item.annotation && (
                              <p
                                style={{
                                  color: 'hsl(var(--foreground))',
                                  whiteSpace: 'pre-wrap',
                                  textAlign: 'left',
                                  fontSize: NOTEBOOK_ANNOTATION_FONT_SIZE_PX,
                                }}
                              >
                                {item.annotation}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            className="absolute"
                            style={{ top: 10, right: 10, color: 'hsl(var(--muted-foreground))' }}
                            onClick={() => setEditingAnnotation({ cardId: item.card_id, value: item.annotation ?? '' })}
                          >
                            <Pencil size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {folderKind === 'collection' && displayMode === 'album' && gridCardSize && (
                  <div className="flex justify-center">
                    <div
                      className="grid grid-cols-2"
                      style={{ gap: GRID_GAP_PX, width: gridCardSize.w * 2 + GRID_GAP_PX }}
                    >
                      {visibleItems.map((item) => {
                        const c = cardDataById.get(item.card_id);
                        return (
                          <div
                            key={item.card_id}
                            className="rounded-xl overflow-hidden"
                            style={{ width: gridCardSize.w, height: gridCardSize.h, border: c ? '1px solid hsl(var(--border))' : 'none' }}
                          >
                            {c
                              ? <MindCardBody style={c.style} className="w-full h-full" clipped onClick={() => setDetailCard(c)} />
                              : <CardPlaceholder width={gridCardSize.w} height={gridCardSize.h} />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 卡夹：接入同一条连续滚动，鼠标在卡片范围内滚轮切卡片
                    （轮播组件内部已经处理好，不会同时带动页面滚动），
                    鼠标在卡片范围外滚轮正常滚这条外层页面。 */}
                {isStack && stackCardSize && (
                  <div
                    className="flex justify-center items-center"
                    style={{
                      minHeight: contentAreaH,
                      // 纵向轮播上下露出的"前一张/后一张"卡片，是靠绝对定位主动
                      // 探出当前卡片本身边界之外实现的伪纵深效果——这部分探出去
                      // 的空间必须单独预留，否则会顶进信息区的地盘（可见度文字
                      // 被上方探出来的卡片盖住，就是这个原因）。0.5倍卡片高度是
                      // 一个留有余量的安全值，不是精确算出来的，实测后如果还是
                      // 不够或者太多，调这一个数字即可。
                      paddingTop: stackCardSize.h * 0.5,
                      paddingBottom: stackCardSize.h * 0.5,
                      boxSizing: 'border-box',
                    }}
                  >
                    {stackCards.length > 0
                      ? (
                        <MindCardVerticalCarousel
                          cards={stackCards}
                          currentIndex={stackIndex}
                          onIndexChange={setStackIndex}
                          cardWidth={stackCardSize.w}
                          cardHeight={stackCardSize.h}
                          onCardClick={setDetailCard}
                        />
                      )
                      : (
                        <p className="text-center text-sm py-8" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('folders.loading')}</p>
                      )}
                  </div>
                )}
                {isStack && !stackCardSize && (
                  <div className="flex justify-center items-center" style={{ minHeight: contentAreaH }}>
                    <p className="text-center text-sm py-8" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('folders.loading')}</p>
                  </div>
                )}

                {hasMore && <div ref={bottomSentinelRef} style={{ height: 1 }} />}
              </div>
            )}
          </div>
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

      {editingAnnotation && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-6"
          style={{ background: 'hsl(var(--background) / 0.6)' }}
          onClick={() => setEditingAnnotation(null)}
        >
          <div
            className="rounded-2xl p-4 w-full max-w-sm space-y-3"
            style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
            onClick={(e) => e.stopPropagation()}
          >
            <textarea
              autoFocus
              value={editingAnnotation.value}
              onChange={(e) => setEditingAnnotation({ ...editingAnnotation, value: e.target.value })}
              rows={6}
              className="w-full text-sm px-3 py-2 rounded-lg bg-transparent resize-none"
              style={{ border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingAnnotation(null)}
                className="text-xs px-3 py-1.5"
                style={{ color: 'hsl(var(--muted-foreground))' }}
              >
                {t('folders.cancel')}
              </button>
              <button
                type="button"
                onClick={() => editingAnnotation && saveAnnotationMutation.mutate({ cardId: editingAnnotation.cardId, value: editingAnnotation.value.trim() })}
                disabled={saveAnnotationMutation.isPending}
                className="text-xs px-3 py-1.5 rounded-lg"
                style={{ background: 'hsl(var(--foreground))', color: 'hsl(var(--background))', opacity: saveAnnotationMutation.isPending ? 0.6 : 1 }}
              >
                {t('folders.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
