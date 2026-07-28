'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, BookText, BookImage, BookHeart, Notebook } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import BottomSheetPopover from './BottomSheetPopover';
import MindCardFolderCreateForm, { type CreatedMindCardFolder } from './MindCardFolderCreateForm';

type DisplayMode = 'album' | 'stack';
type FolderKind = 'collection' | 'notebook';

interface FolderStatusRow {
  id: string;
  name: string;
  folder_kind: FolderKind;
  display_mode: DisplayMode | null;
  is_default: boolean;
  checked: boolean;
}

interface FolderMultiSelectPopoverProps {
  open: boolean;
  cardId: string;
  onClose: () => void;
  // 每次勾选状态变化都回调一次，父组件据此保持card.favorited与"任意一个夹被勾选"同步
  onFavoritedChange: (favorited: boolean) => void;
}

function folderStatusQueryKey(cardId: string) {
  return ['mind-card-folder-status', cardId] as const;
}

async function fetchFolderStatus(cardId: string): Promise<{ folders: FolderStatusRow[] }> {
  const res = await fetch(`/api/mind-cards/${cardId}/folder-status`);
  if (!res.ok) throw new Error('Failed to fetch folder status');
  return res.json();
}

export default function FolderMultiSelectPopover({
  open, cardId, onClose, onFavoritedChange,
}: FolderMultiSelectPopoverProps) {
  const t = useTranslations('mindcards');
  const queryClient = useQueryClient();
  const queryKey = folderStatusQueryKey(cardId);

  const { data, isLoading: loading } = useQuery({
    queryKey,
    queryFn: () => fetchFolderStatus(cardId),
    enabled: open,
  });
  const folders = data?.folders ?? [];

  const [creating, setCreating] = useState(false);
  // 批语框状态——跟"收藏这个动作"完全独立：点击感想类型的夹立刻收藏生效
  // （走POST，不带annotation），同时弹出这个批语框；框有自己独立的保存按钮，
  // 不点保存、直接关掉整个窗口，也完全不影响这张卡片已经收藏成功这件事。
  const [annotationPrompt, setAnnotationPrompt] = useState<{ folderId: string } | null>(null);
  const [annotationValue, setAnnotationValue] = useState('');

  // 收藏/取消收藏：乐观更新——立刻翻转勾选状态并通知父层，失败了把缓存和
  // 父层通知都恢复回操作之前的样子，不额外弹错误提示。
  const toggleMutation = useMutation({
    mutationFn: async (folder: FolderStatusRow) => {
      const res = await fetch(`/api/mind-cards/${cardId}/folders/${folder.id}`, {
        method: folder.checked ? 'DELETE' : 'POST',
      });
      if (!res.ok) throw new Error(`request failed with status ${res.status}`);
    },
    onMutate: async (folder) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<{ folders: FolderStatusRow[] }>(queryKey);
      const nextFolders = (previous?.folders ?? []).map((f) => (f.id === folder.id ? { ...f, checked: !folder.checked } : f));
      queryClient.setQueryData(queryKey, { folders: nextFolders });
      onFavoritedChange(nextFolders.some((f) => f.checked));
      return { previous };
    },
    onError: (_err, _folder, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
        onFavoritedChange(context.previous.folders.some((f) => f.checked));
      }
    },
    onSuccess: (_data, folder) => {
      // 收藏这个动作（上面已经完成、已经生效）和"要不要顺手写点想法"是两件事：
      // 刚勾选的如果是感想类型的夹，弹出批语框，写不写、保不保存都不会再影响
      // 上面已经成功的收藏关系。
      if (!folder.checked && folder.folder_kind === 'notebook') {
        setAnnotationValue('');
        setAnnotationPrompt({ folderId: folder.id });
      }
    },
  });

  const saveAnnotationMutation = useMutation({
    mutationFn: async (vars: { folderId: string; annotation: string }) => {
      const res = await fetch(`/api/mind-cards/${cardId}/folders/${vars.folderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ annotation: vars.annotation }),
      });
      if (!res.ok) throw new Error('request failed');
    },
    onSuccess: () => setAnnotationPrompt(null),
  });

  // 新建卡片集之后立刻把这张卡片加进去：先乐观地把新夹追加进列表（默认已勾选），
  // 失败了把这一行连同勾选通知一起撤销。
  const addToCreatedFolderMutation = useMutation({
    mutationFn: async (row: FolderStatusRow) => {
      const res = await fetch(`/api/mind-cards/${cardId}/folders/${row.id}`, { method: 'POST' });
      if (!res.ok) throw new Error('request failed');
    },
    onMutate: async (row) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<{ folders: FolderStatusRow[] }>(queryKey);
      const nextFolders = [...(previous?.folders ?? []), row];
      queryClient.setQueryData(queryKey, { folders: nextFolders });
      onFavoritedChange(true);
      return { previous };
    },
    onError: (_err, _row, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
        onFavoritedChange(context.previous.folders.some((f) => f.checked));
      }
    },
    onSuccess: (_data, row) => {
      if (row.folder_kind === 'notebook') {
        setAnnotationValue('');
        setAnnotationPrompt({ folderId: row.id });
      }
    },
  });

  if (!open) return null;

  const handleCreated = (folder: CreatedMindCardFolder) => {
    const row: FolderStatusRow = {
      id: folder.id,
      name: folder.name,
      folder_kind: folder.folder_kind,
      display_mode: folder.display_mode,
      is_default: false,
      checked: true,
    };
    setCreating(false);
    addToCreatedFolderMutation.mutate(row);
  };

  return (
    <BottomSheetPopover open={open} onClose={onClose}>
      <div className="space-y-3">
        {/* 批语框弹在多选菜单上方——视觉上跟下面的夹子列表明确分开，让用户
            理解"收藏"和"写想法"不是同一个动作。 */}
        {annotationPrompt && (
          <div className="px-2 py-3 space-y-2 rounded-xl" style={{ background: 'hsl(var(--foreground) / 0.04)' }}>
            <textarea
              autoFocus
              value={annotationValue}
              onChange={(e) => setAnnotationValue(e.target.value)}
              placeholder={t('notebook.annotationPlaceholder')}
              rows={3}
              className="w-full text-sm px-3 py-2 rounded-lg bg-transparent resize-none"
              style={{ border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAnnotationPrompt(null)}
                className="text-xs px-3 py-1.5"
                style={{ color: 'hsl(var(--muted-foreground))' }}
              >
                {t('folders.cancel')}
              </button>
              <button
                type="button"
                onClick={() => annotationPrompt && saveAnnotationMutation.mutate({ folderId: annotationPrompt.folderId, annotation: annotationValue.trim() })}
                disabled={saveAnnotationMutation.isPending}
                className="text-xs px-3 py-1.5 rounded-lg"
                style={{ background: 'hsl(var(--foreground))', color: 'hsl(var(--background))', opacity: saveAnnotationMutation.isPending ? 0.6 : 1 }}
              >
                {t('folders.save')}
              </button>
            </div>
          </div>
        )}

        <div className="space-y-1 max-h-[60vh] overflow-y-auto">
          <div className="text-sm font-medium mb-2" style={{ color: 'hsl(var(--foreground))' }}>
            {t('collectPopover.title')}
          </div>

          {loading && (
            <p className="text-xs py-4 text-center" style={{ color: 'hsl(var(--muted-foreground))' }}>
              {t('folders.loading')}
            </p>
          )}

          {!loading && folders.length === 0 && !creating && (
            <p className="text-xs py-4 text-center" style={{ color: 'hsl(var(--muted-foreground))' }}>
              {t('collectPopover.emptyState')}
            </p>
          )}

          {!loading && folders.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => toggleMutation.mutate(f)}
              className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl text-left"
            >
              <span
                className="flex items-center justify-center rounded-md flex-shrink-0"
                style={{
                  width: 20, height: 20,
                  border: f.checked ? 'none' : '1px solid hsl(var(--border))',
                  background: f.checked ? 'hsl(var(--foreground))' : 'transparent',
                  color: 'hsl(var(--background))',
                }}
              >
                {f.checked && <Check size={13} />}
              </span>
              {f.is_default
                ? <BookHeart size={15} style={{ color: 'hsl(var(--muted-foreground))' }} />
                : f.folder_kind === 'notebook'
                  ? <Notebook size={15} style={{ color: 'hsl(var(--muted-foreground))' }} />
                  : f.display_mode === 'stack'
                    ? <BookImage size={15} style={{ color: 'hsl(var(--muted-foreground))' }} />
                    : <BookText size={15} style={{ color: 'hsl(var(--muted-foreground))' }} />}
              <span className="text-sm flex-1" style={{ color: 'hsl(var(--foreground))' }}>
                {f.is_default ? t('folders.default.name') : f.name}
              </span>
            </button>
          ))}

          {!creating && (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="w-full text-left text-sm px-2 py-2.5 rounded-xl"
              style={{ color: 'hsl(var(--muted-foreground))' }}
            >
              + {t('collectPopover.createNew')}
            </button>
          )}

          {creating && (
            <MindCardFolderCreateForm onCreated={handleCreated} onCancel={() => setCreating(false)} />
          )}
        </div>
      </div>
    </BottomSheetPopover>
  );
}
