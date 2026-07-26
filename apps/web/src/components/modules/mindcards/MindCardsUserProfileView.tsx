'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import MindCardBody from './MindCardBody';
import MindCardDetailModal from './MindCardDetailModal';
import MindCardFolderCard from './MindCardFolderCard';
import FolderBrowseView from './FolderBrowseView';
import type { MindCard } from './MindCardCarousel';
import type { FolderVisibility } from './MindCardFolderEditSheet';

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

interface MindCardsUserProfileViewProps {
  // 要查看的这个人的user_id——这个组件本身不判断"是不是自己"，专门用来看
  // 别人的片语主页；如果要看自己的，用现有的MindCardsProfileView（带完整的
  // 编辑/删除/新建能力），不是这个只读组件的职责范围。
  userId: string;
}

export default function MindCardsUserProfileView({ userId }: MindCardsUserProfileViewProps) {
  const t = useTranslations('mindcards');
  const [tab, setTab] = useState<Tab>('cards');
  const [loading, setLoading] = useState(true);

  const [cards, setCards] = useState<MindCard[]>([]);
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [subscriptions, setSubscriptions] = useState<FolderRow[]>([]);

  // 我自己（当前登录的浏览者）都订阅了哪些卡片集——只在组件挂载时查一次自己的
  // 订阅列表（不传userId，默认查当前登录用户），用来跟这个人的卡片集列表做
  // 比对，决定订阅按钮该显示"订阅"还是"已订阅"，不需要改任何后端接口。
  const [mySubscribedIds, setMySubscribedIds] = useState<Set<string>>(new Set());

  const [detailCardId, setDetailCardId] = useState<string | null>(null);
  const detailCard = cards.find((c) => c.id === detailCardId) ?? null;

  const [browsingFolder, setBrowsingFolder] = useState<FolderRow | null>(null);

  useEffect(() => {
    fetch('/api/mind-cards/profile/subscriptions')
      .then((r) => r.json())
      .then((d) => setMySubscribedIds(new Set((d.folders ?? []).map((f: FolderRow) => f.id))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const url = tab === 'cards' ? `/api/mind-cards/profile/mine?userId=${userId}`
      : tab === 'folders' ? `/api/mind-cards/profile/folders?userId=${userId}`
      : `/api/mind-cards/profile/subscriptions?userId=${userId}`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (tab === 'cards') setCards(d.cards ?? []);
        else if (tab === 'folders') setFolders(d.folders ?? []);
        else setSubscriptions(d.folders ?? []);
      })
      .finally(() => setLoading(false));
  }, [tab, userId]);

  const displayName = (f: FolderRow) => (f.is_default ? t('folders.default.name') : f.name);

  const handleFavoritedChange = (id: string, favorited: boolean) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, favorited } : c)));
  };
  const syncVisibilityLocally = (id: string, v: string) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, visibility: v } : c)));
  };
  const removeCardLocally = (id: string) => {
    setCards((prev) => prev.filter((c) => c.id !== id));
  };

  // 订阅/取消订阅：跟收藏功能同一套规矩——先乐观显示点击后应有的样子，
  // 等后端真正确认成功才算数；失败就悄悄改回去，不弹错误提示，用户只会
  // 看到"点了但没有真的变成已订阅"这一个结果。
  const toggleSubscribe = async (folderId: string, currentlySubscribed: boolean) => {
    setMySubscribedIds((prev) => {
      const next = new Set(prev);
      if (currentlySubscribed) next.delete(folderId); else next.add(folderId);
      return next;
    });
    try {
      const res = await fetch(`/api/mind-cards/folders/${folderId}/subscribe`, {
        method: currentlySubscribed ? 'DELETE' : 'POST',
      });
      if (res.ok) return;
      throw new Error(`request failed with status ${res.status}`);
    } catch (err) {
      console.error('[MindCardsUserProfileView] toggleSubscribe failed:', err);
      setMySubscribedIds((prev) => {
        const reverted = new Set(prev);
        if (currentlySubscribed) reverted.add(folderId); else reverted.delete(folderId);
        return reverted;
      });
    }
  };

  if (browsingFolder) {
    return (
      <FolderBrowseView
        folderId={browsingFolder.id}
        folderName={displayName(browsingFolder)}
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
    );
  }

  return (
    <div className="w-full">
      <div className="flex gap-2 px-4 mb-4">
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
            {t(`userProfile.tabs.${tabKey}`)}
          </button>
        ))}
      </div>

      <div className="px-4">
        {loading && (
          <p className="text-sm text-center py-8" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('folders.loading')}</p>
        )}

        {!loading && tab === 'cards' && (
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

        {!loading && tab === 'folders' && (
          folders.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('empty')}</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {folders.map((f) => {
                const subscribed = mySubscribedIds.has(f.id);
                return (
                  <MindCardFolderCard
                    key={f.id}
                    displayName={displayName(f)}
                    onClick={() => setBrowsingFolder(f)}
                    actions={(
                      <button
                        type="button"
                        onClick={() => toggleSubscribe(f.id, subscribed)}
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

        {!loading && tab === 'subscriptions' && (
          subscriptions.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('empty')}</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {subscriptions.map((f) => (
                <MindCardFolderCard
                  key={f.id}
                  displayName={displayName(f)}
                  onClick={() => setBrowsingFolder(f)}
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
    </div>
  );
}