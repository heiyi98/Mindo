import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ASSESSMENTS } from '@/config/assessments';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get('profile_id');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!profileId) {
    return NextResponse.json({ error: 'profile_id required' }, { status: 400 });
  }

  // 验证档案属于该用户
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', profileId)
    .eq('user_id', user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  // 查询该档案的所有快照
  const { data: snapshots } = await supabase
    .from('snapshots')
    .select('snapshot_type, ai_reading')
    .eq('profile_id', profileId);

  // 构建状态映射
  const snapshotMap = new Map(
    (snapshots || []).map(s => [s.snapshot_type, s])
  );

  const status = ASSESSMENTS.map(assessment => {
    const snapshot = snapshotMap.get(assessment.id);
    return {
      id: assessment.id,
      category: assessment.category,
      isAvailable: assessment.isAvailable,
      isCompleted: !!snapshot,
      hasAiReading: !!snapshot?.ai_reading,
    };
  });

  return NextResponse.json({ status });
}
