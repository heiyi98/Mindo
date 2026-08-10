import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin/requireAdmin';
import { baziRepositoryAdmin } from '@/lib/bazi/adminClient';

// 标记已处理：只是关掉这条警报本身，不会让卡住的记录自动恢复重试——
// 卡住的记录依然靠reading-recovery定时任务在持续尝试。
export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  await baziRepositoryAdmin.resolveAlert(id);
  return NextResponse.json({ success: true });
}
