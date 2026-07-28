'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { ChevronLeft } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
}

// 跟MindCardCommentModal同一套尺寸逻辑——提醒面板不对应任何一张具体卡片，
// 没有"横板还是竖版"这个参照，固定按横板尺寸走。
const BASE_WIDTH_PX = 400;
const BASE_CROSS_PX = (BASE_WIDTH_PX * 4) / 3;

function actorLabel(a: ActorInfo) {
  return a.display_name || a.handle || '';
}

function formatTimestamp(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat(undefined, {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(d);
}

export function notificationsQueryKey() {
  return ['mind-card-notifications'] as const;
}

export async function fetchNotifications(): Promise<{ notifications: NotificationRow[]; unreadCount: number }> {
  const res = await fetch('/api/mind-cards/notifications');
  if (!res.ok) throw new Error('Failed to fetch notifications');
  return res.json();
}

export default function MindCardNotificationPanel({ open, onClose }: MindCardNotificationPanelProps) {
  const t = useTranslations('mindcards');
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const queryClient = useQueryClient();
  const [detailCard, setDetailCard] = useState<MindCard | null>(null);
  const [detailAutoExpandParentId, setDetailAutoExpandParentId] = useState<string | undefined>(undefined);
  const [browsingFolder, setBrowsingFolder] = useState<BrowsingFolder | null>(null);

  const { data, isLoading: loading } = useQuery({
    queryKey: notificationsQueryKey(),
    queryFn: fetchNotifications,
    enabled: open,
  });
  const notifications = data?.notifications ?? [];

  // 标记全部已读——成功后直接把共享缓存里的unreadCount清零，页面上Bell图标的
  // 红点跟这个面板读的是同一份缓存，会自动跟着消失，不需要额外的回调通知父层。
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/mind-cards/notifications/read-all', { method: 'POST' });
      if (!res.ok) throw new Error('request failed');
    },
    onSuccess: () => {
      queryClient.setQueryData(notificationsQueryKey(), (old: { notifications: NotificationRow[]; unreadCount: number } | undefined) =>
        old ? { ...old, unreadCount: 0 } : old
      );
    },
  });

  // 一进面板：拉列表 + 自动把所有未读标记清零，不再需要用户手动点"清扫"——
  // 打开这个面板这个动作本身，就代表"我看过了"。
  useEffect(() => {
    if (!open) return;
    markAllReadMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open || !mounted) return null;

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
      const res = await fetch(`/api/mind-cards/folders/${folderId}/manifest`);
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

  const frameStyle = {
    width: `min(90vw, ${BASE_WIDTH_PX}px)`,
    height: `min(85vh, ${BASE_CROSS_PX}px)`,
  };

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-6"
        style={{ background: 'hsl(var(--background) / 0.6)' }}
        onClick={onClose}
      >
        <div
          className="rounded-2xl flex flex-col overflow-hidden"
          style={{ ...frameStyle, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
            <button type="button" onClick={onClose} style={{ color: 'hsl(var(--foreground))' }}>
              <ChevronLeft size={20} />
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
            {loading && (
              <p className="text-sm text-center py-8" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('folders.loading')}</p>
            )}
            {!loading && notifications.length === 0 && (
              <p className="text-sm text-center py-8" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('notifications.empty')}</p>
            )}

            <div className="space-y-4">
              {!loading && notifications.map((n) => (
                <div key={n.id} className="flex items-start gap-3 py-1">
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