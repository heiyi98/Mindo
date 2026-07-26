import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { mindCardsAdminClient as admin } from '@/lib/mindCards/adminClient';

interface AuthorInfo {
  id: string;
  handle: string;
  display_name: string | null;
}

async function fetchAuthorMap(authorIds: string[]): Promise<Map<string, AuthorInfo>> {
  const uniqueIds = [...new Set(authorIds)];
  const map = new Map<string, AuthorInfo>();
  if (uniqueIds.length === 0) return map;
  const { data } = await admin.from('users').select('id, handle, display_name').in('id', uniqueIds);
  for (const row of data ?? []) map.set(row.id, row);
  return map;
}

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
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: replies, error } = await admin
      .from('mind_card_comments')
      .select('id, author_id, content, created_at, reply_to_comment_id')
      .eq('parent_comment_id', parentCommentId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[mind-cards comments replies GET] error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    // 批量查一遍这一批回复各自引用的目标（如果目标已经被删了，查询结果里
    // 就不会有对应的行，map里找不到=已消失）
    const replyToIds = [...new Set((replies ?? []).map((r) => r.reply_to_comment_id).filter((id): id is string => !!id))];
    const replyTargetMap = new Map<string, { id: string; content: string; author_id: string }>();
    if (replyToIds.length > 0) {
      const { data: targets } = await admin
        .from('mind_card_comments')
        .select('id, content, author_id')
        .in('id', replyToIds);
      for (const t of targets ?? []) replyTargetMap.set(t.id, t);
    }

    const authorIds = (replies ?? []).map((r) => r.author_id);
    const replyTargetAuthorIds = [...replyTargetMap.values()].map((t) => t.author_id);
    const authorMap = await fetchAuthorMap([...authorIds, ...replyTargetAuthorIds]);

    const result = (replies ?? []).map((r) => {
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
