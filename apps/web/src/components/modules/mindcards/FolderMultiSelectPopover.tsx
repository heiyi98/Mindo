'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, BookText, BookImage, BookHeart } from 'lucide-react';
import BottomSheetPopover from './BottomSheetPopover';
import MindCardFolderCreateForm, { type CreatedMindCardFolder } from './MindCardFolderCreateForm';

type DisplayMode = 'album' | 'stack';

interface FolderStatusRow {
  id: string;
  name: string;
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

export default function FolderMultiSelectPopover({
  open, cardId, onClose, onFavoritedChange,
}: FolderMultiSelectPopoverProps) {
  const t = useTranslations('mindcards');
  const [folders, setFolders] = useState<FolderStatusRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/mind-cards/${cardId}/folder-status`)
      .then((r) => r.json())
      .then((d) => setFolders(d.folders ?? []))
      .finally(() => setLoading(false));
  }, [open, cardId]);

  if (!open) return null;

  const notifyFavorited = (rows: FolderStatusRow[]) => {
    onFavoritedChange(rows.some((f) => f.checked));
  };

  const toggle = (folderId: string, checked: boolean) => {
    const next = folders.map((f) => (f.id === folderId ? { ...f, checked: !checked } : f));
    setFolders(next);
    notifyFavorited(next);
    fetch(`/api/mind-cards/${cardId}/folders/${folderId}`, { method: checked ? 'DELETE' : 'POST' });
  };

  const handleCreated = (folder: CreatedMindCardFolder) => {
    const row: FolderStatusRow = {
      id: folder.id,
      name: folder.name,
      display_mode: folder.display_mode,
      is_default: false,
      checked: true,
    };
    const next = [...folders, row];
    setFolders(next);
    notifyFavorited(next);
    fetch(`/api/mind-cards/${cardId}/folders/${row.id}`, { method: 'POST' });
    setCreating(false);
  };

  return (
    <BottomSheetPopover open={open} onClose={onClose}>
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
            onClick={() => toggle(f.id, f.checked)}
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
    </BottomSheetPopover>
  );
}
