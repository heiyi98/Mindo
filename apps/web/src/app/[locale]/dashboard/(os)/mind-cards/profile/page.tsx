'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { ChevronLeft, BookText, Layers, Lock, Pencil, Trash2 } from 'lucide-react';
import MindCardBody from '@/components/modules/mindcards/MindCardBody';
import MindCardDetailModal from '@/components/modules/mindcards/MindCardDetailModal';
import FolderBrowseView from '@/components/modules/mindcards/FolderBrowseView';
import BottomSheetPopover from '@/components/modules/mindcards/BottomSheetPopover';
import type { MindCard } from '@/components/modules/mindcards/MindCardCarousel';

type Tab = 'mine' | 'folders' | 'subscriptions';
type FolderVisibility = 'private' | 'followers' | 'friends' | 'public';

interface FolderRow {
  id: string;
  name: string;
  description: string | null;
  display_mode: 'album' | 'stack' | null;
  visibility: FolderVisibility;
  is_default: boolean;
  item_count: number;
}

export default function MindCardsProfilePage() {
  const t = useTranslations('mindcards');
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('mine');
  const [loading, setLoading] = useState(true);

  const [mineCards, setMineCards] = useState<MindCard[]>([]);
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [subscriptions, setSubscriptions] = useState<FolderRow[]>([]);

  const [detailCard, setDetailCard] = useState<MindCard | null>(null);
  const [browsingFolder, setBrowsingFolder] = useState<FolderRow | null>(null);
  const [editingFolder, setEditingFolder] = useState<FolderRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FolderRow | null>(null);

  useEffect(() => {
    setLoading(true);
    const url = tab === 'mine' ? '/api/mind-cards/profile/mine'
      : tab === 'folders' ? '/api/mind-cards/profile/folders'
      : '/api/mind-cards/profile/subscriptions';
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (tab === 'mine') setMineCards(d.cards ?? []);
        else if (tab === 'folders') setFolders(d.folders ?? []);
        else setSubscriptions(d.folders ?? []);
      })
      .finally(() => setLoading(false));
  }, [tab]);

  const handleToggleLike = (id: string, liked: boolean) => {
    setMineCards((prev) => prev.map((c) => (c.id === id ? { ...c, liked: !liked } : c)));
    fetch(`/api/mind-cards/${id}/like`, { method: liked ? 'DELETE' : 'POST' });
  };
  const handleFavoritedChange = (id: string, favorited: boolean) => {
    setMineCards((prev) => prev.map((c) => (c.id === id ? { ...c, favorited } : c)));
  };

  const confirmDelete = (folder: FolderRow) => {
    if (folder.item_count > 0) { setDeleteTarget(folder); return; }
    doDelete(folder.id);
  };
  const doDelete = (folderId: string) => {
    fetch(`/api/mind-cards/folders/${folderId}`, { method: 'DELETE' }).then(() => {
      setFolders((prev) => prev.filter((f) => f.id !== folderId));
      setDeleteTarget(null);
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
        folderName={browsingFolder.name}
        description={browsingFolder.description}
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
            {(['mine', 'folders', 'subscriptions'] as const).map((tabKey) => (
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

        {!loading && tab === 'mine' && (
          mineCards.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('empty')}</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {mineCards.map((c) => (
                <div
                  key={c.id}
                  className="rounded-xl overflow-hidden"
                  style={{ aspectRatio: '3 / 4', border: '1px solid hsl(var(--border))' }}
                >
                  <MindCardBody style={c.style} className="w-full h-full" clipped onClick={() => setDetailCard(c)} />
                </div>
              ))}
            </div>
          )
        )}

        {!loading && tab === 'folders' && (
          <div className="flex flex-col gap-2">
            {folders.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-3 px-3 py-3 rounded-xl"
                style={{ border: '1px solid hsl(var(--border))' }}
              >
                <button type="button" className="flex items-center gap-3 flex-1 text-left min-w-0" onClick={() => setBrowsingFolder(f)}>
                  {f.display_mode === 'stack'
                    ? <Layers size={16} style={{ color: 'hsl(var(--muted-foreground))' }} />
                    : <BookText size={16} style={{ color: 'hsl(var(--muted-foreground))' }} />}
                  <span className="text-sm flex-1 truncate" style={{ color: 'hsl(var(--foreground))' }}>{f.name}</span>
                  {f.is_default && <Lock size={12} style={{ color: 'hsl(var(--muted-foreground))' }} />}
                  <span className="text-xs flex-shrink-0" style={{ color: 'hsl(var(--muted-foreground))' }}>{f.item_count}</span>
                </button>
                <button type="button" onClick={() => setEditingFolder(f)} style={{ color: 'hsl(var(--muted-foreground))' }}>
                  <Pencil size={14} />
                </button>
                {!f.is_default && (
                  <button type="button" onClick={() => confirmDelete(f)} style={{ color: 'hsl(var(--muted-foreground))' }}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
            {folders.length === 0 && (
              <p className="text-sm text-center py-8" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('empty')}</p>
            )}
          </div>
        )}

        {!loading && tab === 'subscriptions' && (
          <div className="flex flex-col gap-2">
            {subscriptions.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-3 px-3 py-3 rounded-xl"
                style={{ border: '1px solid hsl(var(--border))' }}
              >
                <button type="button" className="flex items-center gap-3 flex-1 text-left min-w-0" onClick={() => setBrowsingFolder(f)}>
                  {f.display_mode === 'stack'
                    ? <Layers size={16} style={{ color: 'hsl(var(--muted-foreground))' }} />
                    : <BookText size={16} style={{ color: 'hsl(var(--muted-foreground))' }} />}
                  <span className="text-sm flex-1 truncate" style={{ color: 'hsl(var(--foreground))' }}>{f.name}</span>
                  <span className="text-xs flex-shrink-0" style={{ color: 'hsl(var(--muted-foreground))' }}>{f.item_count}</span>
                </button>
                <button type="button" onClick={() => handleUnsubscribe(f.id)} className="text-xs flex-shrink-0" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  {t('folders.unsubscribe')}
                </button>
              </div>
            ))}
            {subscriptions.length === 0 && (
              <p className="text-sm text-center py-8" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('empty')}</p>
            )}
          </div>
        )}
      </div>

      {detailCard && (
        <MindCardDetailModal
          open
          card={detailCard}
          onClose={() => setDetailCard(null)}
          onToggleLike={handleToggleLike}
          onFavoritedChange={handleFavoritedChange}
        />
      )}

      <FolderEditSheet
        folder={editingFolder}
        onClose={() => setEditingFolder(null)}
        onSaved={(updated) => {
          setFolders((prev) => prev.map((f) => (f.id === updated.id ? { ...f, ...updated } : f)));
          setEditingFolder(null);
        }}
      />

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: 'hsl(var(--background) / 0.6)' }}
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="rounded-2xl p-5 max-w-xs w-full"
            style={{ background: 'hsl(var(--card))' }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm mb-4" style={{ color: 'hsl(var(--foreground))' }}>{t('folders.deleteConfirmBody')}</p>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setDeleteTarget(null)} className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                {t('folders.cancel')}
              </button>
              <button type="button" onClick={() => doDelete(deleteTarget.id)} className="text-sm" style={{ color: '#FF3B30' }}>
                {t('folders.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
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
    const body: Record<string, unknown> = { visibility, description };
    if (!folder.is_default) body.name = name.trim();

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
        {!folder.is_default && (
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('folders.namePlaceholder')}
            className="w-full text-sm px-3 py-2 rounded-lg bg-transparent"
            style={{ border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}
          />
        )}
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('folders.descriptionPlaceholder')}
          rows={2}
          className="w-full text-sm px-3 py-2 rounded-lg bg-transparent resize-none"
          style={{ border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}
        />
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
              {t(`visibility.${v}`)}
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
