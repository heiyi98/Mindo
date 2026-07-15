'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { ChevronLeft, Eye, Pencil, Trash2, Plus } from 'lucide-react';
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
import FolderBrowseView from './FolderBrowseView';
import BottomSheetPopover from './BottomSheetPopover';
import type { MindCard } from './MindCardCarousel';
import type { MindCardStyleV2 } from '@/lib/mindCards/style';

type Tab = 'myCards' | 'folders' | 'subscriptions';
type FolderVisibility = 'private' | 'followers' | 'friends' | 'public';
type CardVisibility = 'private' | 'followers' | 'friends' | 'public';

interface FolderRow {
  id: string;
  name: string;
  description: string | null;
  display_mode: 'album' | 'stack' | null;
  visibility: FolderVisibility;
  is_default: boolean;
  order_index?: number;
  latest_card: { id: string; content: string; style: MindCardStyleV2 | null } | null;
}

export default function MindCardsProfileView() {
  const t = useTranslations('mindcards');
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('myCards');
  const [loading, setLoading] = useState(true);

  const [mineCards, setMineCards] = useState<MindCard[]>([]);
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [subscriptions, setSubscriptions] = useState<FolderRow[]>([]);

  const [detailCard, setDetailCard] = useState<MindCard | null>(null);
  // 存id而不是整张卡片快照：每次渲染都从mineCards里现查，保证改可见度后
  // 弹窗里的高亮选中态跟着状态更新立刻刷新，不用等下次重新拉取数据
  const [visibilityTargetId, setVisibilityTargetId] = useState<string | null>(null);
  const visibilityTarget = mineCards.find((c) => c.id === visibilityTargetId) ?? null;
  const [cardDeleteTarget, setCardDeleteTarget] = useState<MindCard | null>(null);

  const [browsingFolder, setBrowsingFolder] = useState<FolderRow | null>(null);
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

  // ===== 我的卡片：删除 + 改可见度 =====
  const handleFavoritedChange = (id: string, favorited: boolean) => {
    setMineCards((prev) => prev.map((c) => (c.id === id ? { ...c, favorited } : c)));
  };

  const handleVisibilityChange = (cardId: string, visibility: CardVisibility) => {
    setMineCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, visibility } : c)));
    fetch(`/api/mind-cards/${cardId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visibility }),
    });
  };

  const deleteCard = (cardId: string) => {
    setMineCards((prev) => prev.filter((c) => c.id !== cardId));
    setCardDeleteTarget(null);
    fetch(`/api/mind-cards/${cardId}`, { method: 'DELETE' });
  };

  // ===== 卡片集：编辑/删除/新建/拖拽排序 =====
  const confirmDeleteFolder = (folder: FolderRow) => {
    if (folder.latest_card) { setFolderDeleteTarget(folder); return; }
    doDeleteFolder(folder.id);
  };
  const doDeleteFolder = (folderId: string) => {
    fetch(`/api/mind-cards/folders/${folderId}`, { method: 'DELETE' }).then(() => {
      setFolders((prev) => prev.filter((f) => f.id !== folderId));
      setFolderDeleteTarget(null);
    });
  };

  const handleFolderCreated = (folder: CreatedMindCardFolder) => {
    setFolders((prev) => [...prev, { ...folder, latest_card: null }]);
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

  if (browsingFolder) {
    return (
      <FolderBrowseView
        folderId={browsingFolder.id}
        folderName={displayName(browsingFolder)}
        description={browsingFolder.is_default ? null : browsingFolder.description}
        displayMode={browsingFolder.display_mode ?? 'album'}
        onClose={() => setBrowsingFolder(null)}
      />
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
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
                <div key={c.id} className="relative rounded-xl overflow-hidden" style={{ aspectRatio: '3 / 4', border: '1px solid hsl(var(--border))' }}>
                  <div className="absolute inset-0 cursor-pointer" onClick={() => setDetailCard(c)}>
                    <MindCardBody style={c.style} className="w-full h-full" clipped />
                  </div>
                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setVisibilityTargetId(c.id)}
                      className="flex items-center justify-center rounded-full"
                      style={{ width: 24, height: 24, background: 'hsl(var(--background) / 0.7)', color: 'hsl(var(--foreground))' }}
                    >
                      <Eye size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCardDeleteTarget(c)}
                      className="flex items-center justify-center rounded-full"
                      style={{ width: 24, height: 24, background: 'hsl(var(--background) / 0.7)', color: 'hsl(var(--foreground))' }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
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
                    onOpen={() => setBrowsingFolder(f)}
                    onEdit={() => setEditingFolder(f)}
                    onDelete={() => confirmDeleteFolder(f)}
                    emptyLabel={t('emptyState.noCards')}
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
                  isDefault={f.is_default}
                  coverStyle={f.latest_card?.style ?? null}
                  emptyLabel={t('emptyState.noCards')}
                  onClick={() => setBrowsingFolder(f)}
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

      {detailCard && (
        <MindCardDetailModal
          open
          card={detailCard}
          onClose={() => setDetailCard(null)}
          onFavoritedChange={handleFavoritedChange}
        />
      )}

      {visibilityTarget && (
        <BottomSheetPopover open onClose={() => setVisibilityTargetId(null)}>
          <div className="space-y-1">
            {(['public', 'followers', 'friends', 'private'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => handleVisibilityChange(visibilityTarget.id, v)}
                className="w-full text-left text-sm px-3 py-2.5 rounded-xl"
                style={{
                  background: visibilityTarget.visibility === v ? 'hsl(var(--foreground) / 0.08)' : 'transparent',
                  color: 'hsl(var(--foreground))',
                }}
              >
                {t(`visibility.${v}`)}
              </button>
            ))}
          </div>
        </BottomSheetPopover>
      )}

      {cardDeleteTarget && (
        <ConfirmDialog
          title={t('myCards.deleteConfirmTitle')}
          body={t('myCards.deleteConfirmBody')}
          confirmLabel={t('myCards.delete')}
          onCancel={() => setCardDeleteTarget(null)}
          onConfirm={() => deleteCard(cardDeleteTarget.id)}
        />
      )}

      {creatingFolder && (
        <BottomSheetPopover open onClose={() => setCreatingFolder(false)}>
          <MindCardFolderCreateForm onCreated={handleFolderCreated} onCancel={() => setCreatingFolder(false)} />
        </BottomSheetPopover>
      )}

      <FolderEditSheet
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

function SortableFolderTile({ folder, displayName, onOpen, onEdit, onDelete, emptyLabel }: {
  folder: FolderRow;
  displayName: string;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  emptyLabel: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: folder.id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : 1, opacity: isDragging ? 0.8 : 1 };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <MindCardFolderCard
        displayName={displayName}
        isDefault={folder.is_default}
        coverStyle={folder.latest_card?.style ?? null}
        emptyLabel={emptyLabel}
        onClick={onOpen}
        actions={(
          <>
            <button
              type="button"
              onClick={onEdit}
              className="flex items-center justify-center rounded-full"
              style={{ width: 24, height: 24, background: 'hsl(var(--background) / 0.7)', color: 'hsl(var(--foreground))' }}
            >
              <Pencil size={12} />
            </button>
            {!folder.is_default && (
              <button
                type="button"
                onClick={onDelete}
                className="flex items-center justify-center rounded-full"
                style={{ width: 24, height: 24, background: 'hsl(var(--background) / 0.7)', color: 'hsl(var(--foreground))' }}
              >
                <Trash2 size={12} />
              </button>
            )}
          </>
        )}
      />
    </div>
  );
}

function ConfirmDialog({ title, body, confirmLabel, onCancel, onConfirm }: {
  title: string;
  body: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const t = useTranslations('mindcards');
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'hsl(var(--background) / 0.6)' }}
      onClick={onCancel}
    >
      <div
        className="rounded-2xl p-5 max-w-xs w-full"
        style={{ background: 'hsl(var(--card))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm font-medium mb-2" style={{ color: 'hsl(var(--foreground))' }}>{title}</p>
        <p className="text-sm mb-4" style={{ color: 'hsl(var(--muted-foreground))' }}>{body}</p>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
            {t('folders.cancel')}
          </button>
          <button type="button" onClick={onConfirm} className="text-sm" style={{ color: '#FF3B30' }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function FolderEditSheet({ folder, onClose, onSaved }: {
  folder: FolderRow | null;
  onClose: () => void;
  onSaved: (updated: FolderRow) => void;
}) {
  const t = useTranslations('mindcards');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<FolderVisibility>('private');

  useEffect(() => {
    if (!folder) return;
    setName(folder.name);
    setDescription(folder.description ?? '');
    setVisibility(folder.visibility);
  }, [folder]);

  if (!folder) return null;

  const save = () => {
    const body: Record<string, unknown> = { visibility };
    if (!folder.is_default) {
      body.name = name.trim();
      body.description = description;
    }

    fetch(`/api/mind-cards/folders/${folder.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.folder) onSaved({ ...folder, ...d.folder });
      });
  };

  return (
    <BottomSheetPopover open={!!folder} onClose={onClose}>
      <div className="space-y-3">
        {folder.is_default ? (
          // 默认收藏夹不可改名/改介绍：直接不渲染这两个输入框，不靠点击后弹提示文案说明限制
          <p className="text-sm" style={{ color: 'hsl(var(--foreground))' }}>{t('folders.default.name')}</p>
        ) : (
          <>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('folderForm.namePlaceholder')}
              className="w-full text-sm px-3 py-2 rounded-lg bg-transparent"
              style={{ border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('folderForm.descriptionPlaceholder')}
              rows={2}
              className="w-full text-sm px-3 py-2 rounded-lg bg-transparent resize-none"
              style={{ border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}
            />
          </>
        )}
        <div className="flex flex-wrap gap-1.5">
          {(['public', 'followers', 'friends', 'private'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setVisibility(v)}
              className="text-xs px-2.5 py-1.5 rounded-lg"
              style={{
                border: '1px solid hsl(var(--border))',
                background: visibility === v ? 'hsl(var(--foreground) / 0.1)' : 'transparent',
                color: 'hsl(var(--foreground))',
              }}
            >
              {t(`folderVisibility.${v}`)}
            </button>
          ))}
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={save}
            className="text-xs px-3 py-1.5 rounded-lg"
            style={{ background: 'hsl(var(--foreground))', color: 'hsl(var(--background))' }}
          >
            {t('folders.save')}
          </button>
        </div>
      </div>
    </BottomSheetPopover>
  );
}
