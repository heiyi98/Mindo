import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth/requireAuth';
import { baziRepositoryAdmin } from '@/lib/bazi/adminClient';

// 软删除：报告是付费凭证，不物理清除，只打deleted_at标记。
// 删除后对应档案的"当前报告"查询查不到这条记录，档案回到可重新生成的初始状态。
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await requireApiUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const result = await baziRepositoryAdmin.deleteReading(id, user.id);
  if (result === 'not_found') return NextResponse.json({ error: 'Not found' }, { status: 404 });
  // 报告还在生成中/卡住，不允许手动删除——必须等reading-recovery定时任务走完
  // 退款流程，防止用户在报告卡住时手动删除导致扣了款/核销了凭证却没有退还
  if (result === 'not_done') {
    return NextResponse.json({ error: 'Reading not done', code: 'reading_not_done' }, { status: 409 });
  }

  return NextResponse.json({ success: true });
}
