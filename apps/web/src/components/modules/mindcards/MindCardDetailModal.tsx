'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { Eye, Bookmark, MessageSquareMore, SquareArrowOutUpRight, Trash2, Plus } from 'lucide-react';
import html2canvas from 'html2canvas';
import { useQuery, useMutation } from '@tanstack/react-query';
import MindCardBody from './MindCardBody';
import FolderMultiSelectPopover from './FolderMultiSelectPopover';
import BottomSheetPopover from './BottomSheetPopover';
import MindCardCommentModal, { commentsQueryKey, fetchComments } from './MindCardCommentModal';
import type { MindCard } from './MindCardCarousel';
import { useRouter } from '@/i18n/navigation';

interface MindCardDetailModalProps {
  open: boolean;
  card: MindCard;
  onClose: () => void;
  onFavoritedChange: (id: string, favorited: boolean) => void;
  onVisibilityChange?: (id: string, visibility: string) => void;
  onDeleted?: (id: string) => void;
  // 提醒中心点开一条留言/回复类通知时用：卡片一打开就自动展开留言面板，
  // 不需要用户自己再点一次留言按钮。autoExpandParentId透传给
  // MindCardCommentModal，reply类通知额外需要自动展开对应一级留言的回复列表。
  autoOpenComments?: boolean;
  autoExpandParentId?: string;
}

const BASE_WIDTH_PX = 400;
const BASE_CROSS_PX = (BASE_WIDTH_PX * 4) / 3;

const VISIBILITY_OPTIONS = ['public', 'followers', 'friends', 'private'] as const;

export default function MindCardDetailModal({
  open, card, onClose, onFavoritedChange, onVisibilityChange, onDeleted,
  autoOpenComments, autoExpandParentId,
}: MindCardDetailModalProps) {
  const t = useTranslations('mindcards');
  const router = useRouter();
  const [folderPickerOpen, setFolderPickerOpen] = useState(false);
  const [commentPopoverOpen, setCommentPopoverOpen] = useState(autoOpenComments === true);
  const [visibilityOpen, setVisibilityOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const cardFrameRef = useRef<HTMLDivElement>(null);
  // 是否已关注这张卡片的作者——不能只用useState的初始值（弹窗组件在轮播场景
  // 下可能不会真正卸载重建，只是card这个prop换了内容，初始值只在首次挂载时
  // 生效，不会跟着prop变化自动同步，必须用effect显式同步，否则容易出现
  // "换了一张卡片，关注状态还残留着上一张卡片作者的状态"这种串台问题。
  const [followed, setFollowed] = useState(card.authorFollowedByViewer ?? false);
  useEffect(() => {
    setFollowed(card.authorFollowedByViewer ?? false);
  }, [card.id, card.authorFollowedByViewer]);
  // 只在客户端挂载完成后才允许创建portal——document在服务端渲染阶段不存在，
  // 这个守卫避免SSR阶段直接调用createPortal(..., document.body)报错。
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // 跟MindCardCommentModal/MindCardCarousel共用同一份评论数缓存——面板内
  // 的乐观更新（发/删留言）会直接反映在这个数量徽标上，不需要额外回调。
  const { data: commentsData } = useQuery({
    queryKey: commentsQueryKey(card.id),
    queryFn: () => fetchComments(card.id),
    enabled: open,
  });
  const commentCount = commentsData?.totalCount ?? 0;

  // 可见度修改：乐观更新——立刻通知父层显示新的可见度，失败了悄悄改回
  // 修改前的值，不额外弹错误提示。
  const changeVisibilityMutation = useMutation({
    mutationFn: async (v: string) => {
      const res = await fetch(`/api/mind-cards/${card.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility: v }),
      });
      if (!res.ok) throw new Error('request failed');
    },
    onMutate: (v) => {
      const previousVisibility = card.visibility;
      onVisibilityChange?.(card.id, v);
      return { previousVisibility };
    },
    onError: (_err, _v, context) => {
      if (context) onVisibilityChange?.(card.id, context.previousVisibility);
    },
  });

  const deleteCardMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/mind-cards/${card.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('request failed');
    },
  });

  // 关注作者：乐观更新——立刻点亮"+关注"胶囊，失败悄悄撤销，不弹错误提示，
  // 遵循收藏/关注类操作统一的体验规则。
  const followMutation = useMutation({
    mutationFn: async (targetId: string) => {
      const res = await fetch('/api/follows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId }),
      });
      if (!res.ok) throw new Error('request failed');
    },
    onMutate: () => {
      setFollowed(true);
    },
    onError: () => {
      setFollowed(false);
    },
  });

  if (!open || !mounted) return null;

  const vertical = card.style?.card?.vertical ?? false;
  const isOwn = card.is_own === true;
  const anyPopoverOpen = folderPickerOpen || visibilityOpen || deleteConfirmOpen;

  const changeVisibility = (v: string) => {
    setVisibilityOpen(false);
    changeVisibilityMutation.mutate(v);
  };

  const confirmDelete = () => {
    setDeleteConfirmOpen(false);
    onDeleted?.(card.id);
    onClose();
    deleteCardMutation.mutate();
  };

  const handleFollow = () => {
    followMutation.mutate(card.user_id);
  };

  const openAuthorProfile = () => {
    if (!card.author?.handle) return;
    router.push(`/dashboard/mind-cards/profile/${card.author.handle}`);
  };

  const exportAsImage = async () => {
    if (!cardFrameRef.current || exporting) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(cardFrameRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement('a');
      link.download = `mindcard-${card.id}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('[MindCardDetailModal] export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  // 高度不能是一个预先算好写死的数字——宽度在窄屏幕上会被min(90vw,400px)压缩变小，
  // 如果配套的高度还是按400px这个理想值提前算好的固定值，两者就会各自变化、互相
  // 脱节，比例跑偏。改成让高度跟宽度用同一条calc()公式实时联动（宽度×4/3），
  // 不管宽度最终被压缩成多少，高度都会跟着重新算一遍，任何屏幕下都能保持真正的3:4。
  // 竖版同理，宽度跟着高度（被min(85vh,...)压缩后的实际值）实时联动。
  const frameStyle = vertical
    ? {
        height: `min(85vh, ${BASE_CROSS_PX}px)`,
        minWidth: `calc(min(85vh, ${BASE_CROSS_PX}px) * 3 / 4)`,
        maxWidth: '90vw',
        border: '1px solid hsl(var(--border))',
        borderRadius: 16,
        overflow: 'hidden' as const,
      }
    : {
        width: `min(90vw, ${BASE_WIDTH_PX}px)`,
        minHeight: `calc(min(90vw, ${BASE_WIDTH_PX}px) * 4 / 3)`,
        border: '1px solid hsl(var(--border))',
        borderRadius: 16,
        overflow: 'hidden' as const,
      };

  // 作者信息行：头像位置先留空（设计需求，等真做头像了直接往这个位置填，
  // 不用重新排版）+ 名字（不显示handle，跳转和关注判断内部仍然用得到）+
  // 关注胶囊（已关注/是自己的卡片都不显示）。位置叠在actionBar正上方，
  // 两条各自独立，不挤在同一行里。
  const authorBar = card.author && (
    <div
      className="absolute left-0 right-0 flex items-center gap-2 px-3"
      style={{ bottom: 46 }}
      onClick={(e) => e.stopPropagation()}
      data-html2canvas-ignore="true"
    >
      {/* 头像预留空间——目前不放任何占位图形，纯粹占位置 */}
      <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }} />
      <button
        type="button"
        onClick={openAuthorProfile}
        className="text-sm"
        style={{ color: 'hsl(var(--foreground))' }}
      >
        {card.author.display_name || card.author.handle}
      </button>
      {!isOwn && !followed && (
        <button
          type="button"
          onClick={handleFollow}
          className="flex items-center justify-center rounded-full"
          style={{ width: 18, height: 18, background: 'hsl(var(--foreground))', color: 'hsl(var(--background))' }}
        >
          <Plus size={12} />
        </button>
      )}
    </div>
  );

  // 按钮栏叠加在卡片内部（通过MindCardBody的overlay插槽），不再是卡片下方
  // 独立一条。data-html2canvas-ignore让导出图片时自动跳过这一层，不会把
  // 按钮本身也拍进导出的图片里。
  const actionBar = (
    <div
      className="absolute bottom-0 left-0 right-0 flex items-center justify-around px-3 py-2.5"
      style={{
        background: 'linear-gradient(to top, hsl(var(--background) / 0.75), transparent)',
      }}
      onClick={(e) => e.stopPropagation()}
      data-html2canvas-ignore="true"
    >
      {isOwn ? (
        <button type="button" onClick={() => setVisibilityOpen(true)} style={{ color: 'hsl(var(--foreground))' }}>
          <Eye size={18} />
        </button>
      ) : <span />}
      <button type="button" onClick={() => setFolderPickerOpen(true)} style={{ color: 'hsl(var(--foreground))' }}>
        <Bookmark size={18} fill={card.favorited ? 'currentColor' : 'none'} />
      </button>
      <button
        type="button"
        onClick={() => setCommentPopoverOpen(true)}
        className="flex items-center gap-1"
        style={{ color: 'hsl(var(--foreground))' }}
      >
        <MessageSquareMore size={18} />
        {commentCount > 0 && <span className="text-xs">{commentCount}</span>}
      </button>
      <button type="button" onClick={exportAsImage} disabled={exporting} style={{ color: 'hsl(var(--foreground))', opacity: exporting ? 0.5 : 1 }}>
        <SquareArrowOutUpRight size={18} />
      </button>
      {isOwn ? (
        <button type="button" onClick={() => setDeleteConfirmOpen(true)} style={{ color: '#FF3B30' }}>
          <Trash2 size={18} />
        </button>
      ) : <span />}
    </div>
  );

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-50 overflow-y-auto"
        style={{ background: 'hsl(var(--background) / 0.6)' }}
        onClick={() => { if (!anyPopoverOpen) onClose(); }}
      >
        <div className="min-h-full flex flex-col items-center justify-center gap-3 p-6">
          <MindCardBody
            ref={cardFrameRef}
            style={card.style}
            grow
            frameStyle={frameStyle}
            onClick={(e) => e.stopPropagation()}
            overlay={(
              <>
                {authorBar}
                {actionBar}
              </>
            )}
          />
        </div>
      </div>

      <FolderMultiSelectPopover
        open={folderPickerOpen}
        cardId={card.id}
        onClose={() => setFolderPickerOpen(false)}
        onFavoritedChange={(favorited) => onFavoritedChange(card.id, favorited)}
      />

      <MindCardCommentModal
        cardId={card.id}
        vertical={vertical}
        open={commentPopoverOpen}
        onClose={() => setCommentPopoverOpen(false)}
        autoExpandParentId={autoExpandParentId}
      />

      {isOwn && (
        <BottomSheetPopover open={visibilityOpen} onClose={() => setVisibilityOpen(false)}>
          <div className="space-y-1">
            {VISIBILITY_OPTIONS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => changeVisibility(v)}
                className="w-full text-left text-sm px-3 py-2.5 rounded-xl"
                style={{
                  background: card.visibility === v ? 'hsl(var(--foreground) / 0.08)' : 'transparent',
                  color: 'hsl(var(--foreground))',
                }}
              >
                {t(`visibility.${v}`)}
              </button>
            ))}
          </div>
        </BottomSheetPopover>
      )}

      {isOwn && deleteConfirmOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-6"
          style={{ background: 'hsl(var(--background) / 0.6)' }}
          onClick={() => setDeleteConfirmOpen(false)}
        >
          <div
            className="rounded-2xl p-5 max-w-xs w-full"
            style={{ background: 'hsl(var(--card))' }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-medium mb-2" style={{ color: 'hsl(var(--foreground))' }}>{t('myCards.deleteConfirmTitle')}</p>
            <p className="text-sm mb-4" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('myCards.deleteConfirmBody')}</p>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setDeleteConfirmOpen(false)} className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                {t('folders.cancel')}
              </button>
              <button type="button" onClick={confirmDelete} className="text-sm" style={{ color: '#FF3B30' }}>
                {t('myCards.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body,
  );
}