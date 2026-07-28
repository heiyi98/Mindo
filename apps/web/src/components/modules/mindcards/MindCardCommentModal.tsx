'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { ChevronLeft } from 'lucide-react';
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import ConfirmDialog from './ConfirmDialog';
import { MIND_CARD_COMMENT_MAX_LENGTH, countGraphemes, truncateToGraphemes } from '@/lib/mindCards/textLength';
import { useMindCardsMe } from '@/hooks/queries/useMindCardsMe';

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

export function commentsQueryKey(cardId: string) {
  return ['mind-card-comments', cardId] as const;
}

function repliesQueryKey(parentId: string) {
  return ['mind-card-replies', parentId] as const;
}

export async function fetchComments(cardId: string): Promise<{ totalCount: number; comments: TopComment[] }> {
  const res = await fetch(`/api/mind-cards/${cardId}/comments`);
  if (!res.ok) throw new Error('Failed to fetch comments');
  return res.json();
}

async function fetchReplies(parentId: string): Promise<{ replies: ReplyComment[] }> {
  const res = await fetch(`/api/mind-cards/comments/${parentId}/replies`);
  if (!res.ok) throw new Error('Failed to fetch replies');
  return res.json();
}

export default function MindCardCommentModal({ cardId, vertical, open, onClose, autoExpandParentId }: MindCardCommentModalProps) {
  const t = useTranslations('mindcards');
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const queryClient = useQueryClient();
  const { data: me } = useMindCardsMe();

  const { data, isLoading: loading } = useQuery({
    queryKey: commentsQueryKey(cardId),
    queryFn: () => fetchComments(cardId),
    enabled: open,
  });
  const comments = data?.comments ?? [];

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const expandedIdsArray = useMemo(() => [...expandedIds], [expandedIds]);

  const repliesResults = useQueries({
    queries: expandedIdsArray.map((parentId) => ({
      queryKey: repliesQueryKey(parentId),
      queryFn: () => fetchReplies(parentId),
      enabled: open,
    })),
  });

  // 这两处不能用useMemo：依赖数组里展开了repliesResults.map(...)，它的
  // 长度会随"展开了几条留言的回复"变化，而React要求依赖列表的项数每次
  // 渲染必须固定不变（只能变值，不能变个数），用户一展开/收起留言就会
  // 触发"The final argument passed to useMemo changed size"这个报错。
  // 这里运算本身很轻，直接每次渲染都重新算一遍，不需要用useMemo优化。
  const repliesMap: Record<string, ReplyComment[]> = {};
  expandedIdsArray.forEach((id, i) => { repliesMap[id] = repliesResults[i]?.data?.replies ?? []; });

  const repliesLoading = new Set<string>();
  expandedIdsArray.forEach((id, i) => { if (repliesResults[i]?.isLoading) repliesLoading.add(id); });

  const [inputValue, setInputValue] = useState('');
  const [replyContext, setReplyContext] = useState<{
    parentCommentId: string;
    replyToCommentId?: string;
    quoteAuthor: string;
    quoteContent: string;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; parentId?: string } | null>(null);

  // 输入法组字处理：组字过程中（比如拼音还没选字确认）不做字数拦截，
  // 避免打断输入法的正常组字；等组字真正结束（onCompositionEnd）提交
  // 最终文字的那一刻，才检查是否超限。
  const [isComposing, setIsComposing] = useState(false);

  const toggleReplies = (commentId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  };

  // 提醒中心点开一条"有人回复你"的通知：自动展开对应一级留言的二级回复列表，
  // 不需要用户手动点"展开N条回复"。用ref记一次open周期只自动触发一次，避免
  // 其他状态变化（比如切换其他留言的展开态）反复重新触发这段逻辑。
  const autoExpandedRef = useRef<string | null>(null);
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

  // 发留言/回复：乐观更新——立刻在界面上插入一条临时条目（用me的身份信息
  // 顶上作者名），后台异步真正提交；成功了让onSettled重新拉取权威数据，
  // 悄悄把临时条目换成真实的（用户无感知）；失败了onError把缓存恢复回
  // 乐观更新之前的快照，不额外弹错误提示打扰用户。
  const postCommentMutation = useMutation({
    mutationFn: async (vars: { content: string; parentCommentId?: string; replyToCommentId?: string }) => {
      const res = await fetch(`/api/mind-cards/${cardId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vars),
      });
      if (!res.ok) throw new Error('request failed');
      return res.json();
    },
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: commentsQueryKey(cardId) });
      const prevComments = queryClient.getQueryData<{ totalCount: number; comments: TopComment[] }>(commentsQueryKey(cardId));

      const tempId = `temp-${Date.now()}`;
      const meAuthor: AuthorInfo = { id: me?.id ?? '', handle: me?.handle ?? '', display_name: me?.display_name ?? null };

      if (!vars.parentCommentId) {
        queryClient.setQueryData(commentsQueryKey(cardId), (old: { totalCount: number; comments: TopComment[] } | undefined) => ({
          totalCount: (old?.totalCount ?? 0) + 1,
          comments: [
            { id: tempId, content: vars.content, created_at: new Date().toISOString(), author: meAuthor, is_own: true, reply_count: 0 },
            ...(old?.comments ?? []),
          ],
        }));
        return { prevComments, prevReplies: undefined, parentCommentId: undefined as string | undefined };
      }

      const parentId = vars.parentCommentId;
      await queryClient.cancelQueries({ queryKey: repliesQueryKey(parentId) });
      const prevReplies = queryClient.getQueryData<{ replies: ReplyComment[] }>(repliesQueryKey(parentId));

      const replyTo = vars.replyToCommentId
        ? (prevReplies?.replies ?? []).find((r) => r.id === vars.replyToCommentId)
        : undefined;

      queryClient.setQueryData(commentsQueryKey(cardId), (old: { totalCount: number; comments: TopComment[] } | undefined) => ({
        totalCount: (old?.totalCount ?? 0) + 1,
        comments: (old?.comments ?? []).map((c) => (c.id === parentId ? { ...c, reply_count: c.reply_count + 1 } : c)),
      }));

      queryClient.setQueryData(repliesQueryKey(parentId), (old: { replies: ReplyComment[] } | undefined) => ({
        replies: [
          ...(old?.replies ?? []),
          {
            id: tempId,
            content: vars.content,
            created_at: new Date().toISOString(),
            author: meAuthor,
            is_own: true,
            reply_to: replyTo ? { id: replyTo.id, content: replyTo.content, author: replyTo.author, deleted: false } : null,
          },
        ],
      }));

      return { prevComments, prevReplies, parentCommentId: parentId };
    },
    onError: (_err, _vars, context) => {
      if (context?.prevComments !== undefined) queryClient.setQueryData(commentsQueryKey(cardId), context.prevComments);
      if (context?.parentCommentId && context.prevReplies !== undefined) {
        queryClient.setQueryData(repliesQueryKey(context.parentCommentId), context.prevReplies);
      }
    },
    onSettled: (_data, _error, _vars, context) => {
      queryClient.invalidateQueries({ queryKey: commentsQueryKey(cardId) });
      if (context?.parentCommentId) queryClient.invalidateQueries({ queryKey: repliesQueryKey(context.parentCommentId) });
    },
  });

  // 删除留言：乐观更新——发请求之前就先从界面上移除，不等确认成功才移除
  // （早期版本是后者，会导致"看着像没生效"、用户忍不住点第二次、第二次
  // 目标已经不存在报404）。失败了onError把缓存恢复回删除前的快照。
  const deleteCommentMutation = useMutation({
    mutationFn: async (vars: { id: string; parentId?: string }) => {
      const res = await fetch(`/api/mind-cards/comments/${vars.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('request failed');
    },
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: commentsQueryKey(cardId) });
      const prevComments = queryClient.getQueryData<{ totalCount: number; comments: TopComment[] }>(commentsQueryKey(cardId));

      if (vars.parentId) {
        await queryClient.cancelQueries({ queryKey: repliesQueryKey(vars.parentId) });
        const prevReplies = queryClient.getQueryData<{ replies: ReplyComment[] }>(repliesQueryKey(vars.parentId));

        queryClient.setQueryData(repliesQueryKey(vars.parentId), (old: { replies: ReplyComment[] } | undefined) => ({
          replies: (old?.replies ?? []).filter((r) => r.id !== vars.id),
        }));
        queryClient.setQueryData(commentsQueryKey(cardId), (old: { totalCount: number; comments: TopComment[] } | undefined) => ({
          totalCount: Math.max(0, (old?.totalCount ?? 0) - 1),
          comments: (old?.comments ?? []).map((c) => (c.id === vars.parentId ? { ...c, reply_count: Math.max(0, c.reply_count - 1) } : c)),
        }));

        return { prevComments, prevReplies, parentId: vars.parentId };
      }

      // 删的是一级留言：连同它底下所有回复一起从总数里扣掉
      const target = prevComments?.comments.find((c) => c.id === vars.id);
      const removedTotal = 1 + (target?.reply_count ?? 0);
      queryClient.setQueryData(commentsQueryKey(cardId), (old: { totalCount: number; comments: TopComment[] } | undefined) => ({
        totalCount: Math.max(0, (old?.totalCount ?? 0) - removedTotal),
        comments: (old?.comments ?? []).filter((c) => c.id !== vars.id),
      }));
      queryClient.removeQueries({ queryKey: repliesQueryKey(vars.id) });

      return { prevComments, prevReplies: undefined, parentId: undefined as string | undefined };
    },
    onError: (_err, vars, context) => {
      if (context?.prevComments !== undefined) queryClient.setQueryData(commentsQueryKey(cardId), context.prevComments);
      if (vars.parentId && context?.prevReplies !== undefined) queryClient.setQueryData(repliesQueryKey(vars.parentId), context.prevReplies);
    },
    onSettled: (_data, _error, vars) => {
      queryClient.invalidateQueries({ queryKey: commentsQueryKey(cardId) });
      if (vars.parentId) queryClient.invalidateQueries({ queryKey: repliesQueryKey(vars.parentId) });
    },
  });

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

  const submitComment = () => {
    const content = inputValue.trim();
    if (!content || postCommentMutation.isPending) return;
    postCommentMutation.mutate({
      content,
      parentCommentId: replyContext?.parentCommentId,
      replyToCommentId: replyContext?.replyToCommentId,
    });
    setInputValue('');
    setReplyContext(null);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteCommentMutation.mutate(deleteTarget);
    setDeleteTarget(null);
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
              disabled={!inputValue.trim() || postCommentMutation.isPending}
              className="text-sm px-3 py-2 rounded-lg flex-shrink-0"
              style={{
                background: 'hsl(var(--foreground))',
                color: 'hsl(var(--background))',
                opacity: (!inputValue.trim() || postCommentMutation.isPending) ? 0.4 : 1,
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