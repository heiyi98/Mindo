import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth/requireAuth';
import { mindCardsAdminClient as admin, mindCardsRepository as repo } from '@/lib/mindCards/adminClient';
import { fetchAuthorMap } from '@/lib/mindCards/authors';

// GET /api/mind-cards/comments/:id/replies — 某条一级留言下的所有二级留言，时间正序
// （回复要按发生顺序看才符合因果关系，不是倒序）。每条附带它引用的目标预览——
// 如果被引用的那条已经不存在了，reply_to字段里的content会是null，前端据此
// 显示"该评论已消失"这句占位提示，"在回复谁"这个引用关系本身不受影响。
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: parentCommentId } = await params;
    const { user } = await requireApiUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const replies = await repo.listReplies(parentCommentId);

    // 批量查一遍这一批回复各自引用的目标（如果目标已经被删了，查询结果里
    // 就不会有对应的行，map里找不到=已消失）
    const replyToIds = [...new Set(replies.map((r) => r.reply_to_comment_id).filter((id): id is string => !!id))];
    const replyTargetMap = replyToIds.length > 0 ? await repo.getCommentsByIds(replyToIds) : new Map();

    const authorIds = replies.map((r) => r.author_id);
    const replyTargetAuthorIds = [...replyTargetMap.values()].map((t) => t.author_id);
    const authorMap = await fetchAuthorMap(admin, [...authorIds, ...replyTargetAuthorIds]);

    const result = replies.map((r) => {
      const target = r.reply_to_comment_id ? replyTargetMap.get(r.reply_to_comment_id) : null;
      return {
        id: r.id,
        content: r.content,
        created_at: r.created_at,
        author: authorMap.get(r.author_id) ?? { id: r.author_id, handle: '', display_name: null },
        is_own: r.author_id === user.id,
        reply_to: r.reply_to_comment_id
          ? (target
            ? {
                id: target.id,
                content: target.content,
                author: authorMap.get(target.author_id) ?? { id: target.author_id, handle: '', display_name: null },
                deleted: false,
              }
            : { id: r.reply_to_comment_id, content: null, author: null, deleted: true })
          : null,
      };
    });

    return NextResponse.json({ replies: result });
  } catch (error) {
    console.error('[mind-cards comments replies GET] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
