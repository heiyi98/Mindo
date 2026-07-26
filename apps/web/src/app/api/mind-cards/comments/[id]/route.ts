import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { mindCardsAdminClient as admin } from '@/lib/mindCards/adminClient';

// DELETE /api/mind-cards/comments/:id — 删除一条留言（一级或二级）
// 权限：留言本人，或者这张卡片的作者，都能删。
// 删一级留言：数据库外键会自动级联删掉它底下所有的二级回复（不做回收站）。
// 删二级留言：只删这一条，引用它的其他留言不受影响（对方的reply_to_comment_id
// 会被数据库外键自动置空，前端据此显示"该评论已消失"）。
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: commentId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: comment } = await admin
      .from('mind_card_comments')
      .select('id, author_id, card_id')
      .eq('id', commentId)
      .maybeSingle();
    if (!comment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { data: card } = await admin
      .from('mind_cards')
      .select('user_id')
      .eq('id', comment.card_id)
      .maybeSingle();

    const isCommentAuthor = comment.author_id === user.id;
    const isCardAuthor = card?.user_id === user.id;
    if (!isCommentAuthor && !isCardAuthor) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await admin.from('mind_card_comments').delete().eq('id', commentId);
    if (error) {
      console.error('[mind-cards comments DELETE] error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[mind-cards comments DELETE] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
