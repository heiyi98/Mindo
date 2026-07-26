'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { ChevronLeft, Plus } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import MindCardBody from './MindCardBody';
import MindCardDetailModal from './MindCardDetailModal';
import MindCardFolderCard from './MindCardFolderCard';
import MindCardFolderCreateForm, { type CreatedMindCardFolder } from './MindCardFolderCreateForm';
import MindCardFolderEditSheet, { type FolderVisibility } from './MindCardFolderEditSheet';
import ConfirmDialog from './ConfirmDialog';
import FolderBrowseView from './FolderBrowseView';
import BottomSheetPopover from './BottomSheetPopover';
import type { MindCard } from './MindCardCarousel';

type Tab = 'myCards' | 'folders' | 'subscriptions';

interface FolderRow {
  id: string;
  name: string;
  description: string | null;
  folder_kind: 'collection' | 'notebook';
  display_mode: 'album' | 'stack' | null;
  visibility: FolderVisibility;
  is_default: boolean;
  order_index?: number;
}

export default function MindCardsProfileView() {
  const t = useTranslations('mindcards');
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('myCards');
  const [loading, setLoading] = useState(true);

  const [mineCards, setMineCards] = useState<MindCard[]>([]);
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [subscriptions, setSubscriptions] = useState<FolderRow[]>([]);

  // 存id而不是整张卡片的快照：如果存快照，收藏状态变化后mineCards列表更新了，
  // 弹窗里显示的还是点开那一刻的旧数据，不会自动跟着刷新（要关掉重开才会变）。
  // 改成存id、每次渲染都从mineCards里现查，列表一变，弹窗显示立刻跟着变。
  const [detailCardId, setDetailCardId] = useState<string | null>(null);
  const detailCard = mineCards.find((c) => c.id === detailCardId) ?? null;

  // browsingFolderRef存id+isOwn，不存完整快照：如果存快照，编辑保存之后
  // folders列表更新了，但详情页显示的还是点进来那一刻的旧数据，感觉像是
  // "没保存"（其实后台真的存进去了，只是页面没跟着刷新）。改成存id、每次
  // 渲染都从folders/subscriptions列表里现查，列表一变，详情页显示立刻跟着变。
  const [browsingFolderRef, setBrowsingFolderRef] = useState<{ id: string; isOwn: boolean } | null>(null);
  const browsingFolder = browsingFolderRef
    ? (() => {
        const folder = (browsingFolderRef.isOwn ? folders : subscriptions).find((f) => f.id === browsingFolderRef.id);
        return folder ? { folder, isOwn: browsingFolderRef.isOwn } : null;
      })()
    : null;
  const [editingFolder, setEditingFolder] = useState<FolderRow | null>(null);
  const [folderDeleteTarget, setFolderDeleteTarget] = useState<FolderRow | null>(null);
  const [creatingFolder, setCreatingFolder] = useState(false);

  useEffect(() => {
    setLoading(true);
    const url = tab === 'myCards' ? '/api/mind-cards/profile/mine'
      : tab === 'folders' ? '/api/mind-cards/profile/folders'
      : '/api/mind-cards/profile/subscriptions';
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (tab === 'myCards') setMineCards(d.cards ?? []);
        else if (tab === 'folders') setFolders(d.folders ?? []);
        else setSubscriptions(d.folders ?? []);
      })
      .finally(() => setLoading(false));
  }, [tab]);

  const displayName = (f: FolderRow) => (f.is_default ? t('folders.default.name') : f.name);

  const handleFavoritedChange = (id: string, favorited: boolean) => {
    setMineCards((prev) => prev.map((c) => (c.id === id ? { ...c, favorited } : c)));
  };
  const syncVisibilityLocally = (cardId: string, visibility: string) => {
    setMineCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, visibility } : c)));
  };
  const removeCardLocally = (cardId: string) => {
    setMineCards((prev) => prev.filter((c) => c.id !== cardId));
  };

  // ===== 卡片集：编辑/删除/新建/拖拽排序 =====
  const confirmDeleteFolder = (folder: FolderRow) => {
    setFolderDeleteTarget(folder);
  };
  const doDeleteFolder = (folderId: string) => {
    fetch(`/api/mind-cards/folders/${folderId}`, { method: 'DELETE' }).then(() => {
      setFolders((prev) => prev.filter((f) => f.id !== folderId));
      setFolderDeleteTarget(null);
      setBrowsingFolderRef(null);
    });
  };

  const handleFolderCreated = (folder: CreatedMindCardFolder) => {
    setFolders((prev) => [...prev, folder]);
    setCreatingFolder(false);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setFolders((items) => {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      const reordered = arrayMove(items, oldIndex, newIndex);
      reordered.forEach((f, index) => {
        fetch(`/api/mind-cards/folders/${f.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_index: index }),
        }).catch(console.error);
      });
      return reordered;
    });
  };

  const handleUnsubscribe = (folderId: string) => {
    setSubscriptions((prev) => prev.filter((f) => f.id !== folderId));
    fetch(`/api/mind-cards/folders/${folderId}/subscribe`, { method: 'DELETE' });
  };

  return (
    <div className="w-full h-full flex flex-col">
      {browsingFolder ? (
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
          onDelete={() => confirmDeleteFolder(browsingFolder.folder)}
        />
      ) : (
        <div className="w-full max-w-xl mx-auto px-4 py-6 flex-1 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => router.back()} style={{ color: 'hsl(var(--foreground))' }}>
              <ChevronLeft size={20} />
            </button>
            <div className="flex gap-2">
              {(['myCards', 'folders', 'subscriptions'] as const).map((tabKey) => (
                <button
                  key={tabKey}
                  onClick={() => setTab(tabKey)}
                  className="px-4 py-2 rounded-xl text-sm font-light"
                  style={{
                    background: tab === tabKey ? 'hsl(var(--foreground) / 0.08)' : 'transparent',
                    color: 'hsl(var(--foreground))',
                  }}
                >
                  {t(`profile.tabs.${tabKey}`)}
                </button>
              ))}
            </div>
          </div>

          {loading && (
            <p className="text-sm text-center py-8" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('folders.loading')}</p>
          )}

          {!loading && tab === 'myCards' && (
            mineCards.length === 0 ? (
              <p className="text-sm text-center py-8" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('empty')}</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {mineCards.map((c) => (
                  <div key={c.id} className="rounded-xl overflow-hidden" style={{ aspectRatio: '3 / 4', border: '1px solid hsl(var(--border))' }}>
                    <MindCardBody style={c.style} className="w-full h-full" clipped onClick={() => setDetailCardId(c.id)} />
                  </div>
                ))}
              </div>
            )
          )}

          {!loading && tab === 'folders' && (
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
          )}

          {!loading && tab === 'subscriptions' && (
            subscriptions.length === 0 ? (
              <p className="text-sm text-center py-8" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('empty')}</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {subscriptions.map((f) => (
                  <MindCardFolderCard
                    key={f.id}
                    displayName={displayName(f)}
                    onClick={() => setBrowsingFolderRef({ id: f.id, isOwn: false })}
                    actions={(
                      <button
                        type="button"
                        onClick={() => handleUnsubscribe(f.id)}
                        className="flex items-center justify-center rounded-full px-2 py-1"
                        style={{ background: 'hsl(var(--background) / 0.7)', color: 'hsl(var(--foreground))', fontSize: 10 }}
                      >
                        {t('subscription.unsubscribeButton')}
                      </button>
                    )}
                  />
                ))}
              </div>
            )
          )}
        </div>
      )}

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

      {creatingFolder && (
        <BottomSheetPopover open onClose={() => setCreatingFolder(false)}>
          <MindCardFolderCreateForm onCreated={handleFolderCreated} onCancel={() => setCreatingFolder(false)} />
        </BottomSheetPopover>
      )}

      <MindCardFolderEditSheet
        folder={editingFolder}
        onClose={() => setEditingFolder(null)}
        onSaved={(updated) => {
          setFolders((prev) => prev.map((f) => (f.id === updated.id ? { ...f, ...updated } : f)));
          setEditingFolder(null);
        }}
      />

      {folderDeleteTarget && (
        <ConfirmDialog
          title={t('folderActions.deleteConfirmTitle')}
          body={t('folderActions.deleteConfirmBody')}
          confirmLabel={t('folderActions.delete')}
          onCancel={() => setFolderDeleteTarget(null)}
          onConfirm={() => doDeleteFolder(folderDeleteTarget.id)}
        />
      )}
    </div>
  );
}

// 卡片集网格瓦片：只负责点击打开+拖拽排序，不再直接暴露编辑/删除——
// 这两个操作统一挪进点开卡片集之后的详情页里做。
function SortableFolderTile({ folder, displayName, onOpen }: {
  folder: FolderRow;
  displayName: string;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: folder.id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : 1, opacity: isDragging ? 0.8 : 1 };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <MindCardFolderCard displayName={displayName} onClick={onOpen} />
    </div>
  );
}