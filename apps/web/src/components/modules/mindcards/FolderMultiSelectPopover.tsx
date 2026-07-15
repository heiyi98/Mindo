'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, BookText, Layers, Lock } from 'lucide-react';
import BottomSheetPopover from './BottomSheetPopover';

type FolderVisibility = 'private' | 'followers' | 'friends' | 'public';
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

const VISIBILITY_OPTIONS: FolderVisibility[] = ['public', 'followers', 'friends', 'private'];

export default function FolderMultiSelectPopover({
  open, cardId, onClose, onFavoritedChange,
}: FolderMultiSelectPopoverProps) {
  const t = useTranslations('mindcards');
  const [folders, setFolders] = useState<FolderStatusRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newVisibility, setNewVisibility] = useState<FolderVisibility | null>(null);
  const [newDisplayMode, setNewDisplayMode] = useState<DisplayMode | null>(null);

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

  const submitNewFolder = () => {
    const name = newName.trim();
    if (!name || !newVisibility || !newDisplayMode) return;

    fetch('/api/mind-cards/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        folder_kind: 'collection',
        display_mode: newDisplayMode,
        visibility: newVisibility,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (!d.folder) return;
        const row: FolderStatusRow = {
          id: d.folder.id,
          name: d.folder.name,
          display_mode: d.folder.display_mode,
          is_default: false,
          checked: true,
        };
        const next = [...folders, row];
        setFolders(next);
        notifyFavorited(next);
        fetch(`/api/mind-cards/${cardId}/folders/${row.id}`, { method: 'POST' });

        setCreating(false);
        setNewName('');
        setNewVisibility(null);
        setNewDisplayMode(null);
      });
  };

  return (
    <BottomSheetPopover open={open} onClose={onClose}>
      <div className="space-y-1 max-h-[60vh] overflow-y-auto">
        <div className="text-sm font-medium mb-2" style={{ color: 'hsl(var(--foreground))' }}>
          {t('folders.multiSelectTitle')}
        </div>

        {loading && (
          <p className="text-xs py-4 text-center" style={{ color: 'hsl(var(--muted-foreground))' }}>
            {t('folders.loading')}
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
            {f.display_mode === 'stack' ? <Layers size={15} style={{ color: 'hsl(var(--muted-foreground))' }} /> : <BookText size={15} style={{ color: 'hsl(var(--muted-foreground))' }} />}
            <span className="text-sm flex-1" style={{ color: 'hsl(var(--foreground))' }}>{f.name}</span>
            {f.is_default && <Lock size={12} style={{ color: 'hsl(var(--muted-foreground))' }} />}
          </button>
        ))}

        {!creating && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="w-full text-left text-sm px-2 py-2.5 rounded-xl"
            style={{ color: 'hsl(var(--muted-foreground))' }}
          >
            + {t('folders.newFolder')}
          </button>
        )}

        {creating && (
          <div className="px-2 py-3 space-y-3 rounded-xl" style={{ background: 'hsl(var(--foreground) / 0.04)' }}>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t('folders.namePlaceholder')}
              className="w-full text-sm px-3 py-2 rounded-lg bg-transparent"
              style={{ border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setNewDisplayMode('album')}
                className="flex-1 text-xs px-2 py-2 rounded-lg"
                style={{
                  border: '1px solid hsl(var(--border))',
                  background: newDisplayMode === 'album' ? 'hsl(var(--foreground) / 0.1)' : 'transparent',
                  color: 'hsl(var(--foreground))',
                }}
              >
                {t('folders.displayModeAlbum')}
              </button>
              <button
                type="button"
                onClick={() => setNewDisplayMode('stack')}
                className="flex-1 text-xs px-2 py-2 rounded-lg"
                style={{
                  border: '1px solid hsl(var(--border))',
                  background: newDisplayMode === 'stack' ? 'hsl(var(--foreground) / 0.1)' : 'transparent',
                  color: 'hsl(var(--foreground))',
                }}
              >
                {t('folders.displayModeStack')}
              </button>
              <button
                type="button"
                disabled
                className="flex-1 text-xs px-2 py-2 rounded-lg"
                style={{ border: '1px solid hsl(var(--border))', color: 'hsl(var(--muted-foreground))', opacity: 0.5 }}
              >
                {t('folders.displayModeJournalComingSoon')}
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {VISIBILITY_OPTIONS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setNewVisibility(v)}
                  className="text-xs px-2.5 py-1.5 rounded-lg"
                  style={{
                    border: '1px solid hsl(var(--border))',
                    background: newVisibility === v ? 'hsl(var(--foreground) / 0.1)' : 'transparent',
                    color: 'hsl(var(--foreground))',
                  }}
                >
                  {t(`visibility.${v}`)}
                </button>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setCreating(false); setNewName(''); setNewVisibility(null); setNewDisplayMode(null); }}
                className="text-xs px-3 py-1.5"
                style={{ color: 'hsl(var(--muted-foreground))' }}
              >
                {t('folders.cancel')}
              </button>
              <button
                type="button"
                onClick={submitNewFolder}
                disabled={!newName.trim() || !newVisibility || !newDisplayMode}
                className="text-xs px-3 py-1.5 rounded-lg"
                style={{
                  background: 'hsl(var(--foreground))',
                  color: 'hsl(var(--background))',
                  opacity: (!newName.trim() || !newVisibility || !newDisplayMode) ? 0.4 : 1,
                }}
              >
                {t('folders.create')}
              </button>
            </div>
          </div>
        )}
      </div>
    </BottomSheetPopover>
  );
}
