import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { preparePhase1Input } from '@mindo/core';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { snapshotId } = await request.json();
    if (!snapshotId) {
      return NextResponse.json({ error: '缺少snapshotId' }, { status: 400 });
    }

    const { data: snapshot, error: snapError } = await supabase
      .from('bazi_snapshots')
      .select('id, calculation_result, user_id, profile_id')
      .eq('id', snapshotId)
      .eq('user_id', user.id)
      .single();

    if (snapError || !snapshot) {
      return NextResponse.json({ error: '快照不存在' }, { status: 404 });
    }

    // 用 preparePhase1Input 生成正确格式的数据清单
    const dataSheet = preparePhase1Input(snapshot.calculation_result);

    const edgeFunctionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-phase1`;

    fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ snapshotId, dataSheet }),
    }).catch(err => console.error('Edge Function触发失败:', err));

    return NextResponse.json({ success: true, message: '报告生成中' });

  } catch (error: any) {
    console.error('触发报告生成失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}