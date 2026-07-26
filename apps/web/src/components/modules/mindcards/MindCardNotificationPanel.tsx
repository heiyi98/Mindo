'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { ChevronLeft, BrushCleaning } from 'lucide-react';
import MindCardBody from './MindCardBody';
import MindCardDetailModal from './MindCardDetailModal';
import FolderBrowseView from './FolderBrowseView';
import type { MindCard } from './MindCardCarousel';
import type { MindCardStyleV2 } from '@/lib/mindCards/style';
import type { FolderVisibility } from './MindCardFolderEditSheet';

interface ActorInfo {
  id: string;
  handle: string;
  display_name: string | null;
}

type NotificationType = 'comment' | 'reply' | 'favorite';

interface NotificationRow {
  id: string;
  type: NotificationType;
  created_at: string;
  read_at: string | null;
  actor: ActorInfo;
  card_id: string;
  comment_id: string | null;
  target_comment_id: string | null;
  expand_parent_id: string | null;
  preview: string | null;
  card_style: MindCardStyleV2 | null;
  folder: { id: string; name: string; is_default: boolean } | null;
}

interface BrowsingFolder {
  id: string;
  name: string;
  description: string | null;
  folder_kind: 'collection' | 'notebook';
  display_mode: 'album' | 'stack' | null;
  visibility: FolderVisibility;
  is_default: boolean;
}

interface MindCardNotificationPanelProps {
  open: boolean;
  onClose: () => void;
  // 每次真正把未读清零（清扫成功）都回调一次，父组件据此让Bell上的红点消失
  onReadAll: () => void;
}

function actorLabel(a: ActorInfo) {
  return a.display_name || a.handle || '';
}

function formatTimestamp(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat(undefined, {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(d);
}

export default function MindCardNotificationPanel({ open, onClose, onReadAll }: MindCardNotificationPanelProps) {
  const t = useTranslations('mindcards');
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [detailCard, setDetailCard] = useState<MindCard | null>(null);
  const [detailAutoExpandParentId, setDetailAutoExpandParentId] = useState<string | undefined>(undefined);
  const [browsingFolder, setBrowsingFolder] = useState<BrowsingFolder | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch('/api/mind-cards/notifications')
      .then((r) => r.json())
      .then((d) => setNotifications(d.notifications ?? []))
      .finally(() => setLoading(false));
  }, [open]);

  if (!open || !mounted) return null;

  const sweep = () => {
    fetch('/api/mind-cards/notifications/read-all', { method: 'POST' })
      .then((r) => {
        if (!r.ok) throw new Error('request failed');
        const now = new Date().toISOString();
        setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? now })));
        onReadAll();
      })
      .catch((err) => console.error('[MindCardNotificationPanel] sweep failed:', err));
  };

  const openCommentTarget = async (n: NotificationRow) => {
    try {
      const res = await fetch(`/api/mind-cards/${n.card_id}`);
      if (!res.ok) return;
      const d = await res.json();
      if (!d.card) return;
      setDetailAutoExpandParentId(n.type === 'reply' ? (n.expand_parent_id ?? undefined) : undefined);
      setDetailCard(d.card);
    } catch (err) {
      console.error('[MindCardNotificationPanel] open card failed:', err);
    }
  };

  const openFolder = async (folderId: string) => {
    try {
      const res = await fetch(`/api/mind-cards/folders/${folderId}/cards`);
      if (!res.ok) return;
      const d = await res.json();
      if (!d.folder) return;
      setBrowsingFolder(d.folder);
    } catch (err) {
      console.error('[MindCardNotificationPanel] open folder failed:', err);
    }
  };

  const handleFavoritedChange = (id: string, favorited: boolean) => {
    setDetailCard((c) => (c && c.id === id ? { ...c, favorited } : c));
  };
  const handleVisibilityChange = (id: string, visibility: string) => {
    setDetailCard((c) => (c && c.id === id ? { ...c, visibility } : c));
  };

  return createPortal(
    <>
      <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'hsl(var(--background))' }}>
        <div className="flex items-center justify-between px-4 py-4 flex-shrink-0">
          <button type="button" onClick={onClose} style={{ color: 'hsl(var(--foreground))' }}>
            <ChevronLeft size={22} />
          </button>
          <button
            type="button"
            onClick={sweep}
            style={{ color: 'hsl(var(--foreground))' }}
            aria-label={t('notifications.sweepButton')}
            title={t('notifications.sweepButton')}
          >
            <BrushCleaning size={18} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-6">
          {loading && (
            <p className="text-sm text-center py-8" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('folders.loading')}</p>
          )}
          {!loading && notifications.length === 0 && (
            <p className="text-sm text-center py-8" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('notifications.empty')}</p>
          )}

          <div className="space-y-4">
            {!loading && notifications.map((n) => (
              <div
                key={n.id}
                className="flex items-start gap-3 py-1"
                style={{ opacity: n.read_at ? 0.55 : 1 }}
              >
                {n.type === 'favorite' && (
                  <div
                    className="rounded-lg overflow-hidden flex-shrink-0"
                    style={{ width: 48, height: 64, border: '1px solid hsl(var(--border))' }}
                  >
                    <MindCardBody style={n.card_style} className="w-full h-full" clipped />
                  </div>
                )}
                <button
                  type="button"
                  className="flex-1 min-w-0 text-left"
                  style={{ cursor: n.type === 'favorite' ? 'default' : 'pointer' }}
                  onClick={() => {
                    if (n.type !== 'favorite') openCommentTarget(n);
                  }}
                >
                  <p className="text-sm" style={{ color: 'hsl(var(--foreground))' }}>
                    <span className="font-medium">{actorLabel(n.actor)}</span>
                    {' '}
                    {n.type === 'comment' && t('notifications.commented')}
                    {n.type === 'reply' && t('notifications.replied')}
                    {n.type === 'favorite' && t('notifications.favorited')}
                  </p>
                  {(n.type === 'comment' || n.type === 'reply') && n.preview && (
                    <p className="text-xs truncate mt-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      {n.preview}
                    </p>
                  )}
                  {n.type === 'favorite' && n.folder && (
                    <span
                      role="button"
                      className="text-xs mt-0.5 underline inline-block"
                      style={{ color: 'hsl(var(--muted-foreground))', cursor: 'pointer' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        openFolder(n.folder!.id);
                      }}
                    >
                      {t('notifications.intoFolder', { folder: n.folder.is_default ? t('folders.default.name') : n.folder.name })}
                    </span>
                  )}
                  <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    {formatTimestamp(n.created_at)}
                  </p>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {detailCard && (
        <MindCardDetailModal
          open
          card={detailCard}
          onClose={() => { setDetailCard(null); setDetailAutoExpandParentId(undefined); }}
          onFavoritedChange={handleFavoritedChange}
          onVisibilityChange={handleVisibilityChange}
          onDeleted={() => setDetailCard(null)}
          autoOpenComments
          autoExpandParentId={detailAutoExpandParentId}
        />
      )}

      {browsingFolder && (
        <FolderBrowseView
          folderId={browsingFolder.id}
          folderName={browsingFolder.is_default ? t('folders.default.name') : browsingFolder.name}
          description={browsingFolder.is_default ? null : browsingFolder.description}
          visibility={browsingFolder.visibility}
          isDefault={browsingFolder.is_default}
          folderKind={browsingFolder.folder_kind}
          displayMode={browsingFolder.display_mode ?? 'album'}
          isOwn={false}
          onClose={() => setBrowsingFolder(null)}
          onEdit={() => {}}
          onDelete={() => {}}
        />
      )}
    </>,
    document.body,
  );
}
