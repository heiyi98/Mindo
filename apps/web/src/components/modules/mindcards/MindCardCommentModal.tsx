'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { ChevronLeft } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';
import { MIND_CARD_COMMENT_MAX_LENGTH, countGraphemes, truncateToGraphemes } from '@/lib/mindCards/textLength';

interface AuthorInfo { id: string; handle: string; display_name: string | null; }
interface TopComment {
  id: string; content: string; created_at: string; author: AuthorInfo; is_own: boolean; reply_count: number;
}
interface ReplyComment {
  id: string; content: string; created_at: string; author: AuthorInfo; is_own: boolean;
  reply_to: { id: string; content: string | null; author: AuthorInfo | null; deleted: boolean } | null;
}

interface MindCardCommentModalProps {
  cardId: string;
  // 卡片本身是横板还是竖版——留言面板要跟卡片详情页用同一套尺寸逻辑，
  // 尺寸计算依据跟MindCardDetailModal完全一致，这里需要传入同样的信息。
  vertical: boolean;
  open: boolean;
  onClose: () => void;
  onCountChange?: (count: number) => void;
  // 提醒中心点开一条"有人回复你"的通知时用：这条通知的target_comment_id
  // 永远是一级留言（回复某条二级留言时，通知记录的也是它所属的一级留言，
  // 不是那条二级留言本身——见通知写入那段规则）。传入后，留言列表加载完成
  // 自动展开这条一级留言底下的二级回复列表，不需要用户手动点"展开N条回复"。
  autoExpandParentId?: string;
}

const BASE_WIDTH_PX = 400;
const BASE_CROSS_PX = (BASE_WIDTH_PX * 4) / 3;

function authorLabel(a: AuthorInfo | null) {
  if (!a) return '';
  return a.display_name || a.handle || '';
}

function formatTimestamp(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat(undefined, {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(d);
}

export default function MindCardCommentModal({ cardId, vertical, open, onClose, onCountChange, autoExpandParentId }: MindCardCommentModalProps) {
  const t = useTranslations('mindcards');
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const autoExpandedRef = useRef<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<TopComment[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [repliesMap, setRepliesMap] = useState<Record<string, ReplyComment[]>>({});
  const [repliesLoading, setRepliesLoading] = useState<Set<string>>(new Set());
  const [inputValue, setInputValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyContext, setReplyContext] = useState<{
    parentCommentId: string;
    replyToCommentId?: string;
    quoteAuthor: string;
    quoteContent: string;
  } | null>(null);
  // 删除前需要一次确认，不能点了就直接删——存的是"待删除的这条留言"，
  // parentId只有二级留言才有（用来知道删完之后该刷新哪个一级留言的回复列表）
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; parentId?: string } | null>(null);

  // 输入法组字处理：组字过程中（比如拼音还没选字确认）不做字数拦截，
  // 避免打断输入法的正常组字；等组字真正结束（onCompositionEnd）提交
  // 最终文字的那一刻，才检查是否超限。
  const [isComposing, setIsComposing] = useState(false);

  const loadComments = () => {
    setLoading(true);
    fetch(`/api/mind-cards/${cardId}/comments`)
      .then((r) => r.json())
      .then((d) => {
        setComments(d.comments ?? []);
        onCountChange?.(d.totalCount ?? 0);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!open) return;
    loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, cardId]);

  // refreshReplies/toggleReplies挪到早退return之前（虽然它们本身不是hook，
  // 不受"hooks不能在条件return之后"这条规则约束），是因为下面这个自动展开
  // 的useEffect需要调用toggleReplies——effect是真正的hook，必须无条件排在
  // 早退return之前，为了引用到它，顺带把这两个函数也提到前面。
  const refreshReplies = (parentId: string) => {
    fetch(`/api/mind-cards/comments/${parentId}/replies`)
      .then((r) => r.json())
      .then((d) => setRepliesMap((prev) => ({ ...prev, [parentId]: d.replies ?? [] })));
  };

  const toggleReplies = (commentId: string) => {
    if (expandedIds.has(commentId)) {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        next.delete(commentId);
        return next;
      });
      return;
    }
    setExpandedIds((prev) => new Set(prev).add(commentId));
    if (!repliesMap[commentId]) {
      setRepliesLoading((prev) => new Set(prev).add(commentId));
      fetch(`/api/mind-cards/comments/${commentId}/replies`)
        .then((r) => r.json())
        .then((d) => setRepliesMap((prev) => ({ ...prev, [commentId]: d.replies ?? [] })))
        .finally(() => {
          setRepliesLoading((prev) => {
            const next = new Set(prev);
            next.delete(commentId);
            return next;
          });
        });
    }
  };

  // 提醒中心点开一条"有人回复你"的通知：自动展开对应一级留言的二级回复列表，
  // 不需要用户手动点"展开N条回复"。用ref记一次open周期只自动触发一次，避免
  // 其他状态变化（比如切换其他留言的展开态）反复重新触发这段逻辑。
  useEffect(() => {
    if (!open) {
      autoExpandedRef.current = null;
      return;
    }
    if (!autoExpandParentId || loading) return;
    if (autoExpandedRef.current === autoExpandParentId) return;
    autoExpandedRef.current = autoExpandParentId;
    if (!expandedIds.has(autoExpandParentId)) toggleReplies(autoExpandParentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, autoExpandParentId, loading]);

  if (!open || !mounted) return null;

  // 统一逻辑：不管是一个字一个字打、一次性粘贴一大段、还是输入法一次性
  // 交上来好几个字，处理方式都一样——这次要新增的内容，能填满剩余空位的
  // 那部分正常保留，填不下的部分直接消失，不做"整个动作直接不生效"这种
  // 处理，也不弹任何提示。截断按"字形簇"来切，不会把一个复杂表情切碎。
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (isComposing) {
      // 输入法正在组字（比如拼音还没选字确认），这个阶段不做任何截断，
      // 等组字真正结束再统一处理，否则会打断输入法的正常工作。
      setInputValue(newValue);
      return;
    }
    setInputValue(truncateToGraphemes(newValue, MIND_CARD_COMMENT_MAX_LENGTH));
  };

  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
    setIsComposing(false);
    setInputValue(truncateToGraphemes(e.currentTarget.value, MIND_CARD_COMMENT_MAX_LENGTH));
  };

  const atLimit = countGraphemes(inputValue) >= MIND_CARD_COMMENT_MAX_LENGTH;

  const submitComment = async () => {
    const content = inputValue.trim();
    if (!content || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/mind-cards/${cardId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          parentCommentId: replyContext?.parentCommentId,
          replyToCommentId: replyContext?.replyToCommentId,
        }),
      });
      if (!res.ok) throw new Error('request failed');
      const repliedParentId = replyContext?.parentCommentId;
      setInputValue('');
      setReplyContext(null);
      loadComments();
      if (repliedParentId && expandedIds.has(repliedParentId)) refreshReplies(repliedParentId);
    } catch (err) {
      console.error('[MindCardCommentModal] submit failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { id: commentId, parentId } = deleteTarget;
    setDeleteTarget(null);
    try {
      const res = await fetch(`/api/mind-cards/comments/${commentId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('request failed');
      loadComments();
      if (parentId) refreshReplies(parentId);
    } catch (err) {
      console.error('[MindCardCommentModal] delete failed:', err);
    }
  };

  // 留言面板的尺寸必须绝对固定，不能被内容撑大——内容多了交给内部滚动
  // 处理，不是让整个面板跟着变高。之前横板用的是minHeight（"下限"，内容
  // 多了照样会把面板撑高），这是个错误，这次改成height（真正写死的高度）。
  const frameStyle = vertical
    ? {
        height: `min(85vh, ${BASE_CROSS_PX}px)`,
        width: `calc(min(85vh, ${BASE_CROSS_PX}px) * 3 / 4)`,
        maxWidth: '90vw',
      }
    : {
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

        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-4">
          {loading && (
            <p className="text-sm text-center py-6" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('folders.loading')}</p>
          )}
          {!loading && comments.length === 0 && (
            <p className="text-sm text-center py-6" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('comments.empty')}</p>
          )}
          {!loading && comments.map((c) => (
            <div key={c.id} className="space-y-1">
              <p className="text-xs font-medium" style={{ color: 'hsl(var(--foreground))' }}>{authorLabel(c.author)}</p>
              <p className="text-sm" style={{ color: 'hsl(var(--foreground))', whiteSpace: 'pre-wrap' }}>{c.content}</p>
              <div className="flex items-center gap-3 text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                <span>{formatTimestamp(c.created_at)}</span>
                <button
                  type="button"
                  onClick={() => setReplyContext({ parentCommentId: c.id, quoteAuthor: authorLabel(c.author), quoteContent: c.content })}
                >
                  {t('comments.reply')}
                </button>
                {c.is_own && (
                  <button type="button" onClick={() => setDeleteTarget({ id: c.id })}>
                    {t('comments.delete')}
                  </button>
                )}
              </div>
              {c.reply_count > 0 && (
                <button
                  type="button"
                  className="text-xs block"
                  style={{ color: 'hsl(var(--muted-foreground))' }}
                  onClick={() => toggleReplies(c.id)}
                >
                  {expandedIds.has(c.id) ? t('comments.hideReplies') : t('comments.viewReplies', { count: c.reply_count })}
                </button>
              )}

              {expandedIds.has(c.id) && (
                <div className="pl-4 space-y-3 border-l" style={{ borderColor: 'hsl(var(--border))' }}>
                  {repliesLoading.has(c.id) && (
                    <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('folders.loading')}</p>
                  )}
                  {(repliesMap[c.id] ?? []).map((r) => (
                    <div key={r.id} className="space-y-1">
                      <p className="text-xs font-medium" style={{ color: 'hsl(var(--foreground))' }}>{authorLabel(r.author)}</p>
                      {r.reply_to && (
                        <div
                          className="text-xs px-2 py-1 rounded-lg truncate"
                          style={{ background: 'hsl(var(--foreground) / 0.05)', color: 'hsl(var(--muted-foreground))' }}
                        >
                          {r.reply_to.deleted
                            ? t('comments.replyTargetDeleted')
                            : `@${authorLabel(r.reply_to.author)}：${r.reply_to.content}`}
                        </div>
                      )}
                      <p className="text-sm" style={{ color: 'hsl(var(--foreground))', whiteSpace: 'pre-wrap' }}>{r.content}</p>
                      <div className="flex items-center gap-3 text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                        <span>{formatTimestamp(r.created_at)}</span>
                        <button
                          type="button"
                          onClick={() => setReplyContext({ parentCommentId: c.id, replyToCommentId: r.id, quoteAuthor: authorLabel(r.author), quoteContent: r.content })}
                        >
                          {t('comments.reply')}
                        </button>
                        {r.is_own && (
                          <button type="button" onClick={() => setDeleteTarget({ id: r.id, parentId: c.id })}>
                            {t('comments.delete')}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex-shrink-0 px-4 py-3" style={{ borderTop: '1px solid hsl(var(--border))' }}>
          {replyContext && (
            <div className="flex items-center justify-between gap-2 text-xs px-1 pb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
              <span className="truncate">
                {t('comments.replyingTo', { name: replyContext.quoteAuthor })}：{replyContext.quoteContent}
              </span>
              <button type="button" onClick={() => setReplyContext(null)} className="flex-shrink-0">×</button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={handleChange}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
              placeholder={t('comments.inputPlaceholder')}
              // 浏览器原生maxLength当一道廉价的粗防线：它数数的方式不精确
              // （按最原始存储单位算，复杂表情可能占到7-8个单位），这里
              // 特意给够余量（放宽到8倍），只用来挡极端情况（比如粘贴几万
              // 字），真正精确的"到底满没满150个字"由上面handleChange里
              // 按字形簇计算的逻辑说了算，这里不需要卡得很准。
              maxLength={MIND_CARD_COMMENT_MAX_LENGTH * 8}
              className="flex-1 text-sm px-3 py-2 rounded-lg bg-transparent"
              style={{ border: `1px solid ${atLimit ? '#FF3B30' : 'hsl(var(--border))'}`, color: 'hsl(var(--foreground))' }}
            />
            <button
              type="button"
              onClick={submitComment}
              disabled={!inputValue.trim() || submitting}
              className="text-sm px-3 py-2 rounded-lg flex-shrink-0"
              style={{
                background: 'hsl(var(--foreground))',
                color: 'hsl(var(--background))',
                opacity: (!inputValue.trim() || submitting) ? 0.4 : 1,
              }}
            >
              {t('comments.send')}
            </button>
          </div>
          {/* 平时什么都不显示；只有真的顶到上限了，才出现这句提示——
              不是一直挂着"还剩多少字"的倒计时。 */}
          {atLimit && (
            <p className="text-xs pt-1" style={{ color: '#FF3B30' }}>
              {t('comments.maxLengthReached', { max: MIND_CARD_COMMENT_MAX_LENGTH })}
            </p>
          )}
        </div>
      </div>
      </div>

      {deleteTarget && (
        <ConfirmDialog
          title={t('comments.deleteConfirmTitle')}
          body={t('comments.deleteConfirmBody')}
          confirmLabel={t('comments.delete')}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}
    </>,
    document.body,
  );
}