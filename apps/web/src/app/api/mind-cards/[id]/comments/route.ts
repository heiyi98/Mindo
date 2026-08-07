import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth/requireAuth';
import { mindCardsAdminClient as admin, mindCardsRepository as repo } from '@/lib/mindCards/adminClient';
import { fetchVisibleCard } from '@/lib/mindCards/visibility';
import { fetchAuthorMap } from '@/lib/mindCards/authors';
import { countGraphemes, MIND_CARD_COMMENT_MAX_LENGTH } from '@/lib/mindCards/textLength';

// GET /api/mind-cards/:id/comments — 一级留言列表（时间倒序）+ 总数（含所有二级）
// + 每条一级留言各自的回复数（用来在界面上显示"查看N条回复"这个小标，
// 具体的二级留言内容不在这里返回，点开小标之后走单独的replies接口按需拉取）
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cardId } = await params;
    const { user } = await requireApiUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const card = await fetchVisibleCard(admin, user.id, cardId);
    if (!card) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const totalCount = await repo.countComments(cardId);
    const topLevel = await repo.listTopLevelComments(cardId);

    const parentIds = topLevel.map((c) => c.id);
    const replyCountMap = await repo.listReplyCountsByParents(parentIds);

    const authorMap = await fetchAuthorMap(admin, topLevel.map((c) => c.author_id));

    const comments = topLevel.map((c) => ({
      id: c.id,
      content: c.content,
      created_at: c.created_at,
      author: authorMap.get(c.author_id) ?? { id: c.author_id, handle: '', display_name: null },
      is_own: c.author_id === user.id,
      reply_count: replyCountMap.get(c.id) ?? 0,
    }));

    return NextResponse.json({ totalCount, comments });
  } catch (error) {
    console.error('[mind-cards comments GET] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/mind-cards/:id/comments — 发布留言（一级或二级）
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cardId } = await params;
    const { user } = await requireApiUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const card = await fetchVisibleCard(admin, user.id, cardId);
    if (!card) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await request.json() as {
      content?: string;
      parentCommentId?: string;
      replyToCommentId?: string;
    };
    const content = (body.content ?? '').trim();
    if (!content) return NextResponse.json({ error: 'Missing content' }, { status: 400 });
    if (countGraphemes(content) > MIND_CARD_COMMENT_MAX_LENGTH) {
      return NextResponse.json({ error: 'Content too long' }, { status: 400 });
    }

    let parentCommentId: string | null = null;
    let replyToCommentId: string | null = null;
    // 通知目标：只在二级留言时才有意义——"这次回复直接对准的那个人"，
    // 不顺着讨论串往上传，也不通知卡片作者（见下方通知写入部分的规则说明）。
    let parentAuthorId: string | null = null;
    let replyToAuthorId: string | null = null;

    if (body.parentCommentId) {
      // 二级留言：校验这个"一级留言"确实存在、属于这张卡片、而且它自己
      // 就是一条真正的一级留言（parent_comment_id为空）——不允许在二级
      // 留言下面再挂三级，结构永远只有两层。
      const parent = await repo.getCommentById(body.parentCommentId);
      if (!parent || parent.card_id !== cardId || parent.parent_comment_id !== null) {
        return NextResponse.json({ error: 'Invalid parentCommentId' }, { status: 400 });
      }
      parentCommentId = parent.id;
      parentAuthorId = parent.author_id;

      if (body.replyToCommentId) {
        // 二级留言之间互相引用：校验被引用的这条，确实是同一条一级留言
        // 底下的二级留言（同一个讨论串里，不能跨串引用）。
        const replyTarget = await repo.getCommentById(body.replyToCommentId);
        if (!replyTarget || replyTarget.parent_comment_id !== parentCommentId) {
          return NextResponse.json({ error: 'Invalid replyToCommentId' }, { status: 400 });
        }
        replyToCommentId = replyTarget.id;
        replyToAuthorId = replyTarget.author_id;
      }
    }

    const { data: comment, error } = await repo.insertComment({
      card_id: cardId,
      author_id: user.id,
      parent_comment_id: parentCommentId,
      reply_to_comment_id: replyToCommentId,
      content,
    });

    if (error || !comment) {
      console.error('[mind-cards comments POST] error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    if (parentCommentId === null) {
      // 一级留言：通知卡片作者，type='comment'——自己评论自己的卡片不触发通知，
      // 跟收藏通知同一个规则
      if (card.user_id !== user.id) {
        const { error: notifError } = await repo.insertNotification({
          recipient_id: card.user_id,
          actor_id: user.id,
          card_id: cardId,
          type: 'comment',
          comment_id: comment.id,
        });
        if (notifError) {
          // 通知写入失败不影响留言本身已经发布成功
          console.error('[mind-cards comments POST] notification error:', notifError);
        }
      }
    } else {
      // 二级留言："有人回复你"只通知这次回复直接对准的那个人，绝不顺着讨论串
      // 往上传，也不通知卡片作者。目标 = 有@具体某条二级留言就是它的作者，
      // 否则（只是直接回复一级留言、没有@任何人）就是一级留言的作者。
      const targetAuthorId = replyToAuthorId ?? parentAuthorId;
      const targetCommentId = replyToCommentId ?? parentCommentId;
      if (targetAuthorId && targetAuthorId !== user.id) {
        const { error: notifError } = await repo.insertNotification({
          recipient_id: targetAuthorId,
          actor_id: user.id,
          card_id: cardId,
          type: 'reply',
          comment_id: comment.id,
          target_comment_id: targetCommentId ?? undefined,
        });
        if (notifError) {
          console.error('[mind-cards comments POST] reply notification error:', notifError);
        }
      }
    }

    return NextResponse.json({ comment });
  } catch (error) {
    console.error('[mind-cards comments POST] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
