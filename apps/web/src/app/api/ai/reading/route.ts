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

    // 读取八字快照
    const { data: snapshot, error: snapError } = await supabase
      .from('bazi_snapshots')
      .select('id, calculation_result, user_id, profile_id')
      .eq('id', snapshotId)
      .eq('user_id', user.id)
      .single();

    if (snapError || !snapshot) {
      return NextResponse.json({ error: '快照不存在' }, { status: 404 });
    }

    // 读取档案出生信息（生成时快照）
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, birth_date, birth_time, birth_lat, birth_lng, birth_place_name, gender')
      .eq('id', snapshot.profile_id)
      .single();

    // 在 bazi_readings 创建新记录
    // calculation_result：把这次的命盘计算结果原样复制一份，钉死在报告自己
    // 身上——之后渲染报告命盘图表只读这一份自留副本，不再跨表查
    // bazi_snapshots，报告从此不依赖档案/快照后续会不会被改动或删除。
    const { data: reading, error: readingError } = await supabase
      .from('bazi_readings')
      .insert({
        user_id: user.id,
        profile_id: snapshot.profile_id,
        profile_display_name: profile?.display_name ?? null,
        birth_date: profile?.birth_date ?? null,
        birth_time: profile?.birth_time ?? null,
        birth_lat: profile?.birth_lat ?? null,
        birth_lng: profile?.birth_lng ?? null,
        birth_place_name: profile?.birth_place_name ?? null,
        birth_gender: profile?.gender ?? null,
        calculation_result: snapshot.calculation_result,
        ai_reading_status: 'generating',
      })
      .select('id')
      .single();

    if (readingError || !reading) {
      return NextResponse.json({ error: '创建报告记录失败' }, { status: 500 });
    }

    // 生成数据清单
    const dataSheet = preparePhase1Input(snapshot.calculation_result);

    const edgeFunctionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-phase1`;

    // Fire and forget：传 readingId 给 Edge Function
    fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ snapshotId, readingId: reading.id, dataSheet }),
    }).catch(err => console.error('Edge Function触发失败:', err));

    return NextResponse.json({ success: true, readingId: reading.id, message: '报告生成中' });

  } catch (error: any) {
    console.error('触发报告生成失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}