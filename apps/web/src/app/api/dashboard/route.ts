import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { engine, analyzeBazi, toBaziSnapshot } from '@mindo/core';
import type { TianGan, DiZhi, BaziSnapshot } from '@mindo/core';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedProfileId = searchParams.get('profile_id');

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('[dashboard API] user:', user?.id, 'authError:', authError);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let profileQuery = supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id);

    if (requestedProfileId) {
      profileQuery = profileQuery.eq('id', requestedProfileId);
    } else {
      profileQuery = profileQuery.eq('is_self', true);
    }

    const { data: profiles } = await profileQuery
      .order('created_at', { ascending: true })
      .limit(1);

    const profile = profiles?.[0] || null;
    console.log('[dashboard API] profile:', profile?.id);

    if (!profile) {
      return NextResponse.json({ error: 'No profile found' }, { status: 404 });
    }

    // 检查快照是否已存在
    const { data: existingSnapshot } = await supabase
      .from('snapshots')
      .select('calculation_result')
      .eq('profile_id', profile.id)
      .eq('snapshot_type', 'bazi')
      .single();
    console.log('[dashboard API] existingSnapshot:', !!existingSnapshot);

    if (existingSnapshot) {
      console.log('[dashboard API] format check:', {
        pillars_yuelingWuxing: existingSnapshot.calculation_result?.pillars?.yuelingWuxing,
        has_relations: existingSnapshot.calculation_result?.relations !== undefined,
        has_influence: existingSnapshot.calculation_result?.influence !== undefined,
        pillars_keys: existingSnapshot.calculation_result?.pillars
          ? Object.keys(existingSnapshot.calculation_result.pillars)
          : null,
      });
      const isNewFormat =
        existingSnapshot.calculation_result?.pillars?.yuelingWuxing !== undefined &&
        existingSnapshot.calculation_result?.relations !== undefined &&
        existingSnapshot.calculation_result?.influence !== undefined;
      if (isNewFormat) {
        return NextResponse.json({
          profile,
          bazi: existingSnapshot.calculation_result as BaziSnapshot,
          fromCache: true,
        });
      }
      // 旧格式：继续往下重新计算，会覆盖旧快照
      await supabase
        .from('snapshots')
        .delete()
        .eq('profile_id', profile.id)
        .eq('snapshot_type', 'bazi');
    }

    // 计算八字
    const birthDate = profile.birth_date;
    const birthTime = profile.birth_time || '12:00';
    const [year, month, day] = birthDate.split('-').map(Number);
    const [hour, minute] = birthTime.split(':').map(Number);
    const timeUnknown = !profile.birth_time;

    const dateStr = `${birthDate}T${birthTime}:00`;
    const lat = profile.birth_lat || 39.9042;
    const lng = profile.birth_lng || 116.4074;

    let baziResult: ReturnType<typeof engine.calculate>;
    try {
      baziResult = engine.calculate({ dateStr, lat, lng, timeUnknown, timezone: profile.birth_timezone || undefined });
    } catch (e: any) {
      console.log('[dashboard API] engine error:', e.message);
      throw e;
    }

    const analysis = analyzeBazi({
      year:  { stem: baziResult.pillars.year.stem as TianGan,  branch: baziResult.pillars.year.branch as DiZhi  },
      month: { stem: baziResult.pillars.month.stem as TianGan, branch: baziResult.pillars.month.branch as DiZhi },
      day:   { stem: baziResult.pillars.day.stem as TianGan,   branch: baziResult.pillars.day.branch as DiZhi   },
      hour:  {
        stem:   (baziResult.pillars.hour.stem || 'Jia') as TianGan,
        branch: (baziResult.pillars.hour.branch || 'Zi') as DiZhi,
      },
    });

    const meta = {
      solarTime: baziResult.meta?.solar_time || '',
      lunarTime: baziResult.meta?.lunar_time || '',
      jieQi:     baziResult.meta?.jie_qi || '',
    };

    const energyScores: Record<string, number> = {
      Wood: 0, Fire: 0, Earth: 0, Metal: 0, Water: 0
    };
    for (const node of analysis.energyNodes) {
      if (node.outputEnabled) {
        energyScores[node.wuxing] = (energyScores[node.wuxing] || 0) + node.energy;
      }
    }

    const calculationResult = toBaziSnapshot(analysis, meta, energyScores as any);

    // 存入快照
    await supabase
      .from('snapshots')
      .insert({
        profile_id: profile.id,
        user_id: user.id,
        snapshot_type: 'bazi',
        input_hash: `${birthDate}_${birthTime}_${lat}_${lng}`,
        calculation_result: calculationResult,
        birth_date: birthDate,
        birth_time: profile.birth_time || null,
        birth_place_name: profile.birth_place_name || null,
      });

    return NextResponse.json({
      profile,
      bazi: calculationResult,
      fromCache: false,
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
