'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { Eye, Bookmark, MessageSquareMore, SquareArrowOutUpRight, Trash2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import MindCardBody from './MindCardBody';
import FolderMultiSelectPopover from './FolderMultiSelectPopover';
import BottomSheetPopover from './BottomSheetPopover';
import MindCardCommentModal from './MindCardCommentModal';
import type { MindCard } from './MindCardCarousel';

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
  const [folderPickerOpen, setFolderPickerOpen] = useState(false);
  const [commentPopoverOpen, setCommentPopoverOpen] = useState(autoOpenComments === true);
  const [commentCount, setCommentCount] = useState(0);
  const [visibilityOpen, setVisibilityOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const cardFrameRef = useRef<HTMLDivElement>(null);
  // 只在客户端挂载完成后才允许创建portal——document在服务端渲染阶段不存在，
  // 这个守卫避免SSR阶段直接调用createPortal(..., document.body)报错。
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // 留言总数拉取——放在早退return之前，遵守hooks不能在条件判断之后声明的规则
  useEffect(() => {
    if (!open) return;
    fetch(`/api/mind-cards/${card.id}/comments`)
      .then((r) => r.json())
      .then((d) => setCommentCount(d.totalCount ?? 0))
      .catch(() => {});
  }, [open, card.id]);

  if (!open || !mounted) return null;

  const vertical = card.style?.card?.vertical ?? false;
  const isOwn = card.is_own === true;
  const anyPopoverOpen = folderPickerOpen || visibilityOpen || deleteConfirmOpen;

  const changeVisibility = (v: string) => {
    onVisibilityChange?.(card.id, v);
    setVisibilityOpen(false);
    fetch(`/api/mind-cards/${card.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visibility: v }),
    }).catch(console.error);
  };

  const confirmDelete = () => {
    setDeleteConfirmOpen(false);
    onDeleted?.(card.id);
    onClose();
    fetch(`/api/mind-cards/${card.id}`, { method: 'DELETE' }).catch(console.error);
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
            overlay={actionBar}
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
        onCountChange={setCommentCount}
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