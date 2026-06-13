import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  engine, analyzeBazi, toBaziSnapshot, computeWuxingAssessment,
  generateDestinyTimeline, generateLifeChart,
} from '@mindo/core';
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

    // ── 获取或计算八字快照 ───────────────────────────────────
    let baziSnapshot: BaziSnapshot;
    let fromCache = true;

    const { data: existingSnapshot } = await supabase
      .from('snapshots')
      .select('id, calculation_result')
      .eq('profile_id', profile.id)
      .eq('snapshot_type', 'bazi')
      .single();
    console.log('[dashboard API] existingSnapshot:', !!existingSnapshot);

    if (existingSnapshot) {
      console.log('[dashboard API] format check:', {
        pillars_yuelingWuxing: existingSnapshot.calculation_result?.pillars?.yuelingWuxing,
        has_relations: existingSnapshot.calculation_result?.relations !== undefined,
        has_influence: existingSnapshot.calculation_result?.influence !== undefined,
        has_pattern: existingSnapshot.calculation_result?.pattern !== undefined,
      });
      const isNewFormat =
        existingSnapshot.calculation_result?.pillars?.yuelingWuxing !== undefined &&
        existingSnapshot.calculation_result?.relations !== undefined &&
        existingSnapshot.calculation_result?.influence !== undefined;

      if (isNewFormat) {
        if (!existingSnapshot.calculation_result?.pattern) {
          // 懒迁移：新格式但缺少 pattern 字段
          console.log('[dashboard API] lazy migration: rebuilding pattern for snapshot:', existingSnapshot.id);
          const pillars = existingSnapshot.calculation_result.pillars as BaziSnapshot['pillars'];
          const migratedAnalysis = analyzeBazi({
            year:  { stem: pillars.year.stem,  branch: pillars.year.branch  },
            month: { stem: pillars.month.stem, branch: pillars.month.branch },
            day:   { stem: pillars.day.stem,   branch: pillars.day.branch   },
            hour:  pillars.hour
              ? { stem: pillars.hour.stem, branch: pillars.hour.branch }
              : undefined,
          });
          const migratedScores: Record<string, number> = {
            Wood: 0, Fire: 0, Earth: 0, Metal: 0, Water: 0,
          };
          for (const node of migratedAnalysis.energyNodes) {
            if (node.outputEnabled) {
              migratedScores[node.wuxing] = (migratedScores[node.wuxing] || 0) + node.energy;
            }
          }
          baziSnapshot = toBaziSnapshot(
            migratedAnalysis,
            existingSnapshot.calculation_result.meta,
            migratedScores as any,
          );
          // 异步写回 DB，不阻塞本次响应
          supabase
            .from('snapshots')
            .update({ calculation_result: baziSnapshot })
            .eq('id', existingSnapshot.id)
            .then(() => {
              console.log('[dashboard API] lazy migration written for snapshot:', existingSnapshot.id);
            });
        } else {
          baziSnapshot = existingSnapshot.calculation_result as BaziSnapshot;
        }
      } else {
        // 旧格式（无 yuelingWuxing/relations/influence）：删除并重算
        await supabase
          .from('snapshots')
          .delete()
          .eq('profile_id', profile.id)
          .eq('snapshot_type', 'bazi');

        baziSnapshot = await computeAndSave(supabase, profile, user.id);
        fromCache = false;
      }
    } else {
      baziSnapshot = await computeAndSave(supabase, profile, user.id);
      fromCache = false;
    }

    // ── 获取或生成人生K线数据 ──────────────────────────────
    const { data: existingTimeline } = await supabase
      .from('life_timeline')
      .select('baseline_imbalance, baseline_energies, years')
      .eq('profile_id', profile.id)
      .single();

    let lifeTimeline: { baseline: number; baselineEnergies: unknown; years: unknown[] };

    if (existingTimeline) {
      lifeTimeline = {
        baseline: existingTimeline.baseline_imbalance as number,
        baselineEnergies: existingTimeline.baseline_energies,
        years: existingTimeline.years as unknown[],
      };
    } else {
      const dateStr = `${profile.birth_date}T${profile.birth_time || '12:00'}:00`;
      const gender: 'M' | 'F' = profile.gender === 'F' ? 'F' : 'M';
      const birthYear = parseInt((profile.birth_date as string).split('-')[0], 10);
      const currentYear = new Date().getFullYear();

      const destinyTimeline = generateDestinyTimeline(dateStr, gender, currentYear);
      const lifeChartData = generateLifeChart(baziSnapshot, destinyTimeline, birthYear);

      await supabase.from('life_timeline').insert({
        profile_id: profile.id,
        user_id: user.id,
        baseline_imbalance: lifeChartData.baseline,
        baseline_energies: lifeChartData.baselineEnergies,
        years: lifeChartData.years,
      });
      console.log('[dashboard API] life_timeline generated for profile:', profile.id);

      lifeTimeline = {
        baseline: lifeChartData.baseline,
        baselineEnergies: lifeChartData.baselineEnergies,
        years: lifeChartData.years,
      };
    }

    return NextResponse.json({
      profile,
      bazi: { ...baziSnapshot, wuxingAssessment: computeWuxingAssessment(baziSnapshot) } as BaziSnapshot,
      fromCache,
      lifeTimeline,
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function computeAndSave(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profile: Record<string, any>,
  userId: string,
): Promise<BaziSnapshot> {
  const birthDate: string = profile.birth_date;
  const birthTime: string = profile.birth_time || '12:00';
  const timeUnknown = !profile.birth_time;
  const dateStr = `${birthDate}T${birthTime}:00`;
  const lat: number = profile.birth_lat || 39.9042;
  const lng: number = profile.birth_lng || 116.4074;

  let baziResult: ReturnType<typeof engine.calculate>;
  try {
    baziResult = engine.calculate({
      dateStr, lat, lng, timeUnknown,
      timezone: profile.birth_timezone || undefined,
    });
  } catch (e: any) {
    console.log('[dashboard API] engine error:', e.message);
    throw e;
  }

  const analysis = analyzeBazi({
    year:  { stem: baziResult.pillars.year.stem as TianGan,  branch: baziResult.pillars.year.branch as DiZhi  },
    month: { stem: baziResult.pillars.month.stem as TianGan, branch: baziResult.pillars.month.branch as DiZhi },
    day:   { stem: baziResult.pillars.day.stem as TianGan,   branch: baziResult.pillars.day.branch as DiZhi   },
    ...(timeUnknown ? {} : {
      hour: {
        stem:   baziResult.pillars.hour.stem as TianGan,
        branch: baziResult.pillars.hour.branch as DiZhi,
      },
    }),
  });

  const meta = {
    solarTime: baziResult.meta?.solar_time || '',
    lunarTime: baziResult.meta?.lunar_time || '',
    jieQi:     baziResult.meta?.jie_qi || '',
  };

  const energyScores: Record<string, number> = {
    Wood: 0, Fire: 0, Earth: 0, Metal: 0, Water: 0,
  };
  for (const node of analysis.energyNodes) {
    if (node.outputEnabled) {
      energyScores[node.wuxing] = (energyScores[node.wuxing] || 0) + node.energy;
    }
  }

  const snapshot = toBaziSnapshot(analysis, meta, energyScores as any);

  await supabase.from('snapshots').insert({
    profile_id: profile.id,
    user_id: userId,
    snapshot_type: 'bazi',
    input_hash: `${birthDate}_${birthTime}_${lat}_${lng}`,
    calculation_result: snapshot,
    birth_date: birthDate,
    birth_time: profile.birth_time || null,
    birth_place_name: profile.birth_place_name || null,
  });

  return snapshot;
}
