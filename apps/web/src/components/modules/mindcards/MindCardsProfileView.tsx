'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { ChevronLeft, Plus } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import MindCardBody from './MindCardBody';
import MindCardDetailModal from './MindCardDetailModal';
import MindCardFolderCard from './MindCardFolderCard';
import FolderBrowseView from './FolderBrowseView';
import BottomSheetPopover from './BottomSheetPopover';
import MindCardFolderCreateForm, { type CreatedMindCardFolder } from './MindCardFolderCreateForm';
import MindCardFolderEditSheet, { type EditableFolder, type FolderVisibility } from './MindCardFolderEditSheet';
import ConfirmDialog from './ConfirmDialog';
import { useMindCardsMe } from '@/hooks/queries/useMindCardsMe';
import { useUserByHandle } from '@/hooks/queries/useUserByHandle';
import { useFollowStatus, followStatusQueryKey, type FollowStatus } from '@/hooks/queries/useFollowStatus';
import type { MindCard } from './MindCardCarousel';

type Tab = 'cards' | 'folders' | 'subscriptions';

interface FolderRow {
  id: string;
  name: string;
  description: string | null;
  folder_kind: 'collection' | 'notebook';
  display_mode: 'album' | 'stack' | null;
  visibility: FolderVisibility;
  is_default: boolean;
}

interface MindCardsProfileViewProps {
  // 从网址里的handle来，要查看的是这个人的个人页——不管是自己还是别人，
  // 都走同一个组件、同一套网址规则，内部判断isOwn再决定能不能编辑。
  targetHandle: string;
}

function profileCardsQueryKey(userId: string) {
  return ['mind-card-profile-cards', userId] as const;
}
function profileFoldersQueryKey(userId: string) {
  return ['mind-card-profile-folders', userId] as const;
}
// 我自己的订阅集合和"正在浏览的这个人的订阅栏内容"共用同一个queryKey体系——
// 看自己主页时target.id===myId，两处天然命中同一份缓存，只发一次请求。
function profileSubscriptionsQueryKey(userId: string) {
  return ['mind-card-profile-subscriptions', userId] as const;
}

async function fetchProfileCards(userId: string): Promise<{ cards: MindCard[] }> {
  const res = await fetch(`/api/mind-cards/profile/mine?userId=${userId}`);
  if (!res.ok) throw new Error('Failed to fetch cards');
  return res.json();
}
async function fetchProfileFolders(userId: string): Promise<{ folders: FolderRow[] }> {
  const res = await fetch(`/api/mind-cards/profile/folders?userId=${userId}`);
  if (!res.ok) throw new Error('Failed to fetch folders');
  return res.json();
}
async function fetchProfileSubscriptions(userId: string): Promise<{ folders: FolderRow[] }> {
  const res = await fetch(`/api/mind-cards/profile/subscriptions?userId=${userId}`);
  if (!res.ok) throw new Error('Failed to fetch subscriptions');
  return res.json();
}

export default function MindCardsProfileView({ targetHandle }: MindCardsProfileViewProps) {
  const t = useTranslations('mindcards');
  const router = useRouter();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<Tab>('cards');
  const [detailCardId, setDetailCardId] = useState<string | null>(null);
  const [browsingFolderRef, setBrowsingFolderRef] = useState<{ id: string; isOwn: boolean } | null>(null);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [editingFolder, setEditingFolder] = useState<FolderRow | null>(null);
  const [folderDeleteTarget, setFolderDeleteTarget] = useState<FolderRow | null>(null);

  // 第一步：解析handle对应的用户，同时查一下自己是谁——两者都拿到才能
  // 判断isOwn。用现成的两个接口，不新建。
  const { data: targetData, isLoading: targetLoading } = useUserByHandle(targetHandle);
  const target = targetData?.user ?? null;
  const notFound = !targetLoading && !target;

  const { data: me, isLoading: meLoading } = useMindCardsMe();
  const loading = targetLoading || meLoading;
  const isOwn = !!(target && me && target.id === me.id);

  // 第二步：判断完isOwn，再去查关注状态（仅看别人时需要）——跟u/[handle]
  // 主页共用同一份/api/follows/status缓存。
  const { data: followStatus } = useFollowStatus(target?.id, !isOwn);
  const iFollow = followStatus?.iFollow ?? false;

  // 我自己的订阅集合——只在看别人的卡片集栏时用来判断订阅按钮该显示什么。
  // 始终按myId查询（不看isOwn），这样跟"看自己订阅栏内容"共用同一份缓存。
  const { data: mySubscriptionsData } = useQuery({
    queryKey: profileSubscriptionsQueryKey(me?.id ?? ''),
    queryFn: () => fetchProfileSubscriptions(me!.id),
    enabled: !!me,
  });
  const mySubscribedIds = new Set((mySubscriptionsData?.folders ?? []).map((f) => f.id));

  // 第三步：按当前tab和目标用户id，拉取对应内容
  const cardsQuery = useQuery({
    queryKey: profileCardsQueryKey(target?.id ?? ''),
    queryFn: () => fetchProfileCards(target!.id),
    enabled: !!target && tab === 'cards',
  });
  const foldersQuery = useQuery({
    queryKey: profileFoldersQueryKey(target?.id ?? ''),
    queryFn: () => fetchProfileFolders(target!.id),
    enabled: !!target && tab === 'folders',
  });
  const subscriptionsQuery = useQuery({
    queryKey: profileSubscriptionsQueryKey(target?.id ?? ''),
    queryFn: () => fetchProfileSubscriptions(target!.id),
    enabled: !!target && tab === 'subscriptions',
  });

  const cards = cardsQuery.data?.cards ?? [];
  const folders = foldersQuery.data?.folders ?? [];
  const subscriptions = subscriptionsQuery.data?.folders ?? [];
  const tabLoading = tab === 'cards' ? cardsQuery.isLoading : tab === 'folders' ? foldersQuery.isLoading : subscriptionsQuery.isLoading;

  const detailCard = cards.find((c) => c.id === detailCardId) ?? null;

  const browsingFolder = browsingFolderRef
    ? (() => {
        const folder = (browsingFolderRef.isOwn ? folders : subscriptions).find((f) => f.id === browsingFolderRef.id);
        return folder ? { folder, isOwn: browsingFolderRef.isOwn } : null;
      })()
    : null;

  const [toggling, setToggling] = useState(false);

  const displayName = (f: FolderRow) => (f.is_default ? t('folders.default.name') : f.name);

  const handleFavoritedChange = (id: string, favorited: boolean) => {
    queryClient.setQueryData(profileCardsQueryKey(target?.id ?? ''), (old: { cards: MindCard[] } | undefined) => ({
      cards: (old?.cards ?? []).map((c) => (c.id === id ? { ...c, favorited } : c)),
    }));
  };
  const syncVisibilityLocally = (id: string, v: string) => {
    queryClient.setQueryData(profileCardsQueryKey(target?.id ?? ''), (old: { cards: MindCard[] } | undefined) => ({
      cards: (old?.cards ?? []).map((c) => (c.id === id ? { ...c, visibility: v } : c)),
    }));
  };
  const removeCardLocally = (id: string) => {
    queryClient.setQueryData(profileCardsQueryKey(target?.id ?? ''), (old: { cards: MindCard[] } | undefined) => ({
      cards: (old?.cards ?? []).filter((c) => c.id !== id),
    }));
  };

  const handleFolderCreated = (folder: CreatedMindCardFolder) => {
    const row: FolderRow = {
      id: folder.id, name: folder.name, description: folder.description,
      folder_kind: folder.folder_kind, display_mode: folder.display_mode,
      visibility: folder.visibility, is_default: false,
    };
    queryClient.setQueryData(profileFoldersQueryKey(target?.id ?? ''), (old: { folders: FolderRow[] } | undefined) => ({
      folders: [...(old?.folders ?? []), row],
    }));
    setCreatingFolder(false);
  };

  // 删除卡片集：乐观移除，失败悄悄恢复。
  const deleteFolderMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/mind-cards/folders/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('request failed');
    },
    onMutate: async (id) => {
      const key = profileFoldersQueryKey(target?.id ?? '');
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<{ folders: FolderRow[] }>(key);
      queryClient.setQueryData(key, { folders: (previous?.folders ?? []).filter((f) => f.id !== id) });
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(profileFoldersQueryKey(target?.id ?? ''), context.previous);
    },
  });

  const confirmDeleteFolder = () => {
    if (!folderDeleteTarget) return;
    const id = folderDeleteTarget.id;
    setFolderDeleteTarget(null);
    deleteFolderMutation.mutate(id);
  };

  // 取消订阅：乐观移除，失败悄悄恢复。取消订阅只出现在"看自己的订阅栏"，
  // target.id此时恒等于me.id。
  const unsubscribeMutation = useMutation({
    mutationFn: async (folderId: string) => {
      const res = await fetch(`/api/mind-cards/folders/${folderId}/subscribe`, { method: 'DELETE' });
      if (!res.ok) throw new Error('request failed');
    },
    onMutate: async (folderId) => {
      const key = profileSubscriptionsQueryKey(target?.id ?? '');
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<{ folders: FolderRow[] }>(key);
      queryClient.setQueryData(key, { folders: (previous?.folders ?? []).filter((f) => f.id !== folderId) });
      return { previous };
    },
    onError: (_err, _folderId, context) => {
      if (context?.previous) queryClient.setQueryData(profileSubscriptionsQueryKey(target?.id ?? ''), context.previous);
    },
  });

  // 订阅/取消订阅（在别人的卡片集栏切换）：乐观翻转，失败悄悄撤销。乐观更新
  // 目标是"我自己的订阅缓存"（不是当前正在浏览的这份folders列表）——这个
  // toggle按钮只出现在"看别人的卡片集栏"，跟"我自己的订阅栏内容"是两份
  // 独立的展示，但背后指向同一份"我订阅了哪些夹"的权威数据。
  const toggleSubscribeMutation = useMutation({
    mutationFn: async (vars: { folder: FolderRow; currentlySubscribed: boolean }) => {
      const res = await fetch(`/api/mind-cards/folders/${vars.folder.id}/subscribe`, {
        method: vars.currentlySubscribed ? 'DELETE' : 'POST',
      });
      if (!res.ok) throw new Error('request failed');
    },
    onMutate: async (vars) => {
      const key = profileSubscriptionsQueryKey(me?.id ?? '');
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<{ folders: FolderRow[] }>(key);
      const nextFolders = vars.currentlySubscribed
        ? (previous?.folders ?? []).filter((f) => f.id !== vars.folder.id)
        : [...(previous?.folders ?? []), vars.folder];
      queryClient.setQueryData(key, { folders: nextFolders });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(profileSubscriptionsQueryKey(me?.id ?? ''), context.previous);
    },
  });

  const toggleSubscribe = (folder: FolderRow, currentlySubscribed: boolean) => {
    toggleSubscribeMutation.mutate({ folder, currentlySubscribed });
  };

  // 关注/取消关注：乐观翻转，失败悄悄撤销。
  const toggleFollowMutation = useMutation({
    mutationFn: async (wasFollowing: boolean) => {
      const res = await fetch('/api/follows', {
        method: wasFollowing ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId: target!.id }),
      });
      if (!res.ok) throw new Error('request failed');
    },
    onMutate: async (wasFollowing) => {
      setToggling(true);
      const key = followStatusQueryKey(target?.id ?? '');
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<FollowStatus>(key);
      queryClient.setQueryData(key, { ...previous, iFollow: !wasFollowing, theyFollow: previous?.theyFollow ?? false, isSelf: false });
      return { previous };
    },
    onError: (_err, _wasFollowing, context) => {
      if (context?.previous) queryClient.setQueryData(followStatusQueryKey(target?.id ?? ''), context.previous);
    },
    onSettled: () => setToggling(false),
  });

  const handleToggleFollow = () => {
    if (!target || toggling) return;
    toggleFollowMutation.mutate(iFollow);
  };

  const messageMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId }),
      });
      if (!res.ok) throw new Error('request failed');
      return res.json() as Promise<{ conversationId: string }>;
    },
    onSuccess: (data) => {
      router.push(`/dashboard/messages?conv=${data.conversationId}`);
    },
  });

  const handleMessage = () => {
    if (!target || messageMutation.isPending) return;
    messageMutation.mutate(target.id);
  };

  // 卡片集拖拽排序：静默保存新顺序，不需要用户手动确认。
  const reorderFoldersMutation = useMutation({
    mutationFn: async (reordered: FolderRow[]) => {
      await Promise.all(reordered.map((f, i) =>
        fetch(`/api/mind-cards/folders/${f.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_index: i }),
        })
      ));
    },
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const handleDragEnd = (event: { active: { id: string | number }; over: { id: string | number } | null }) => {
    if (!isOwn || !event.over || event.active.id === event.over.id) return;
    const oldIndex = folders.findIndex((f) => f.id === event.active.id);
    const newIndex = folders.findIndex((f) => f.id === event.over!.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = [...folders];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved);
    queryClient.setQueryData(profileFoldersQueryKey(target?.id ?? ''), { folders: next });
    reorderFoldersMutation.mutate(next);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>...</span>
      </div>
    );
  }

  if (notFound || !target) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('empty')}</span>
      </div>
    );
  }

  if (browsingFolder) {
    return (
      <FolderBrowseView
        folderId={browsingFolder.folder.id}
        folderName={displayName(browsingFolder.folder)}
        description={browsingFolder.folder.is_default ? null : browsingFolder.folder.description}
        visibility={browsingFolder.folder.visibility}
        isDefault={browsingFolder.folder.is_default}
        folderKind={browsingFolder.folder.folder_kind}
        displayMode={browsingFolder.folder.display_mode ?? 'album'}
        isOwn={browsingFolder.isOwn}
        onClose={() => setBrowsingFolderRef(null)}
        onEdit={() => setEditingFolder(browsingFolder.folder)}
        onDelete={() => setFolderDeleteTarget(browsingFolder.folder)}
      />
    );
  }

  return (
    <div className="w-full min-h-screen">
      <div className="w-full max-w-xl mx-auto px-4 py-6 flex flex-col gap-4">
        <button type="button" onClick={() => router.back()} style={{ color: 'hsl(var(--foreground))' }}>
          <ChevronLeft size={20} />
        </button>

        {/* 头像预留空间+名字+handle——不管看自己还是看别人都显示，保持
            版式一致；头像目前不放任何占位图形，纯粹占位置，等真做了直接填 */}
        <div className="flex flex-col items-center gap-2 py-2">
          <div style={{ width: 64, height: 64, borderRadius: '50%' }} />
          <p className="text-base" style={{ color: 'hsl(var(--foreground))' }}>
            {target.display_name || target.handle}
          </p>
          <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>@{target.handle}</p>

          {/* 关注/私信——只在看别人的时候出现 */}
          {!isOwn && (
            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={handleToggleFollow}
                disabled={toggling}
                className="px-5 py-2 rounded-xl text-sm"
                style={iFollow
                  ? { background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))', border: '1px solid hsl(var(--border))' }
                  : { background: 'hsl(var(--foreground))', color: 'hsl(var(--background))' }}
              >
                {toggling ? '...' : iFollow ? t('userProfile.following') : t('userProfile.follow')}
              </button>
              <button
                type="button"
                onClick={handleMessage}
                disabled={messageMutation.isPending}
                className="px-5 py-2 rounded-xl text-sm"
                style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--foreground))', border: '1px solid hsl(var(--border))' }}
              >
                {messageMutation.isPending ? '...' : t('userProfile.sendMessage')}
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-center">
          {(['cards', 'folders', 'subscriptions'] as const).map((tabKey) => (
            <button
              key={tabKey}
              onClick={() => setTab(tabKey)}
              className="px-4 py-2 rounded-xl text-sm font-light"
              style={{
                background: tab === tabKey ? 'hsl(var(--foreground) / 0.08)' : 'transparent',
                color: 'hsl(var(--foreground))',
              }}
            >
              {/* "我的卡片"/"卡片"这个文案差异，是这次唯一明确要求的差异点——
                  自己看是"我的卡片"，看别人是"卡片"，避免用他/她这种带
                  性别指向的说法 */}
              {tabKey === 'cards' ? t(isOwn ? 'profile.tabs.myCards' : 'userProfile.tabs.cards') : t(`profile.tabs.${tabKey}`)}
            </button>
          ))}
        </div>

        {tabLoading && (
          <p className="text-sm text-center py-8" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('folders.loading')}</p>
        )}

        {!tabLoading && tab === 'cards' && (
          cards.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('empty')}</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {cards.map((c) => (
                <div key={c.id} className="rounded-xl overflow-hidden" style={{ aspectRatio: '3 / 4', border: '1px solid hsl(var(--border))' }}>
                  <MindCardBody style={c.style} className="w-full h-full" clipped onClick={() => setDetailCardId(c.id)} />
                </div>
              ))}
            </div>
          )
        )}

        {!tabLoading && tab === 'folders' && (
          folders.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('empty')}</p>
          ) : isOwn ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={folders.map((f) => f.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-2 gap-3">
                  {folders.map((f) => (
                    <SortableFolderTile
                      key={f.id}
                      folder={f}
                      displayName={displayName(f)}
                      onOpen={() => setBrowsingFolderRef({ id: f.id, isOwn: true })}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => setCreatingFolder(true)}
                    className="flex items-center justify-center rounded-xl"
                    style={{ aspectRatio: '3 / 4', border: '1px dashed hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }}
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {folders.map((f) => {
                const subscribed = mySubscribedIds.has(f.id);
                return (
                  <MindCardFolderCard
                    key={f.id}
                    displayName={displayName(f)}
                    onClick={() => setBrowsingFolderRef({ id: f.id, isOwn: false })}
                    actions={(
                      <button
                        type="button"
                        onClick={() => toggleSubscribe(f, subscribed)}
                        className="flex items-center justify-center rounded-full px-2 py-1"
                        style={{
                          background: subscribed ? 'hsl(var(--foreground))' : 'hsl(var(--background) / 0.7)',
                          color: subscribed ? 'hsl(var(--background))' : 'hsl(var(--foreground))',
                          fontSize: 10,
                        }}
                      >
                        {subscribed ? t('subscription.subscribedLabel') : t('subscription.subscribeButton')}
                      </button>
                    )}
                  />
                );
              })}
            </div>
          )
        )}

        {!tabLoading && tab === 'subscriptions' && (
          subscriptions.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('empty')}</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {subscriptions.map((f) => (
                <MindCardFolderCard
                  key={f.id}
                  displayName={displayName(f)}
                  onClick={() => setBrowsingFolderRef({ id: f.id, isOwn: false })}
                  actions={isOwn ? (
                    <button
                      type="button"
                      onClick={() => unsubscribeMutation.mutate(f.id)}
                      className="flex items-center justify-center rounded-full px-2 py-1"
                      style={{ background: 'hsl(var(--background) / 0.7)', color: 'hsl(var(--foreground))', fontSize: 10 }}
                    >
                      {t('subscription.unsubscribeButton')}
                    </button>
                  ) : undefined}
                />
              ))}
            </div>
          )
        )}
      </div>

      {detailCard && (
        <MindCardDetailModal
          open
          card={detailCard}
          onClose={() => setDetailCardId(null)}
          onFavoritedChange={handleFavoritedChange}
          onVisibilityChange={syncVisibilityLocally}
          onDeleted={removeCardLocally}
        />
      )}

      {isOwn && creatingFolder && (
        <BottomSheetPopover open onClose={() => setCreatingFolder(false)}>
          <MindCardFolderCreateForm onCreated={handleFolderCreated} onCancel={() => setCreatingFolder(false)} />
        </BottomSheetPopover>
      )}

      {isOwn && editingFolder && (
        <MindCardFolderEditSheet
          folder={editingFolder as EditableFolder}
          onClose={() => setEditingFolder(null)}
          onSaved={(updated) => {
            queryClient.setQueryData(profileFoldersQueryKey(target?.id ?? ''), (old: { folders: FolderRow[] } | undefined) => ({
              folders: (old?.folders ?? []).map((f) => (f.id === updated.id ? { ...f, ...updated } : f)),
            }));
            setEditingFolder(null);
          }}
        />
      )}

      {isOwn && folderDeleteTarget && (
        <ConfirmDialog
          title={t('folderActions.deleteConfirmTitle')}
          body={t('folderActions.deleteConfirmBody')}
          confirmLabel={t('folderActions.delete')}
          onCancel={() => setFolderDeleteTarget(null)}
          onConfirm={confirmDeleteFolder}
        />
      )}
    </div>
  );
}

function SortableFolderTile({
  folder, displayName, onOpen,
}: { folder: FolderRow; displayName: string; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: folder.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <MindCardFolderCard displayName={displayName} onClick={onOpen} />
    </div>
  );
}
