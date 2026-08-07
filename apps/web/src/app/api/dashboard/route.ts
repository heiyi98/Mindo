import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth/requireAuth';
import { createAccountRepository } from '@/lib/account/adminClient';
import { createBaziRepository } from '@/lib/bazi/adminClient';
import {
  calculateUniversalTime, baziEngine, analyzeBazi, toBaziSnapshot, computeWuxingAssessment,
  generateDestinyTimeline, generateLifeChart,
} from '@mindo/core';
import type { TianGan, DiZhi, BaziSnapshot } from '@mindo/core';
import type { BaziRepository } from '@mindo/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedProfileId = searchParams.get('profile_id');

    const { supabase, user } = await requireApiUser();
    console.log('[dashboard API] user:', user?.id);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accountRepo = createAccountRepository(supabase);
    const baziRepo = createBaziRepository(supabase);

    const profileRow = await accountRepo.getProfileForDashboard(user.id, requestedProfileId);
    console.log('[dashboard API] profile:', (profileRow as { id?: string } | null)?.id);

    if (!profileRow) {
      return NextResponse.json({ error: 'No profile found' }, { status: 404 });
    }
    const profile = profileRow as Record<string, any>;

    let baziSnapshot: BaziSnapshot;
    let fromCache = true;

    const existingSnapshot = await baziRepo.getSnapshotForDashboard(profile.id);
    console.log('[dashboard API] existingSnapshot:', !!existingSnapshot);

    if (existingSnapshot) {
      const calcResult = existingSnapshot.calculation_result as any;
      const isNewFormat =
        calcResult?.pillars?.yuelingWuxing !== undefined &&
        calcResult?.relations !== undefined &&
        calcResult?.influence !== undefined;

      if (isNewFormat) {
        if (!calcResult?.pattern) {
          console.log('[dashboard API] lazy migration: rebuilding pattern for snapshot:', existingSnapshot.id);
          const pillars = calcResult.pillars as BaziSnapshot['pillars'];
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
            calcResult.meta,
            migratedScores as any,
          );
          baziRepo.updateSnapshotResult(existingSnapshot.id, baziSnapshot).then(() => {
            console.log('[dashboard API] lazy migration written for snapshot:', existingSnapshot.id);
          });
        } else {
          baziSnapshot = calcResult as BaziSnapshot;
        }
      } else {
        await baziRepo.deleteSnapshotsForProfile(profile.id);

        baziSnapshot = await computeAndSave(baziRepo, profile, user.id);
        fromCache = false;
      }
    } else {
      baziSnapshot = await computeAndSave(baziRepo, profile, user.id);
      fromCache = false;
    }

    const existingTimeline = await baziRepo.getLifeTimeline(profile.id);

    let lifeTimeline: { baseline: number; baselineEnergies: unknown; years: unknown[] };

    if (existingTimeline) {
      lifeTimeline = {
        baseline: existingTimeline.baseline_imbalance,
        baselineEnergies: existingTimeline.baseline_energies,
        years: existingTimeline.years,
      };
    } else {
      const tStr = profile.birth_time || '12:00:00';
      const dateStr = `${profile.birth_date}T${tStr}`;
      const gender: 'M' | 'F' = profile.gender === 'F' ? 'F' : 'M';
      const birthYear = parseInt((profile.birth_date as string).split('-')[0], 10);
      const currentYear = new Date().getFullYear();

      const destinyTimeline = generateDestinyTimeline(dateStr, gender, currentYear);
      const lifeChartData = generateLifeChart(baziSnapshot, destinyTimeline, birthYear);

      await baziRepo.insertLifeTimeline({
        profileId: profile.id,
        userId: user.id,
        baselineImbalance: lifeChartData.baseline,
        baselineEnergies: lifeChartData.baselineEnergies,
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
  baziRepo: BaziRepository,
  profile: Record<string, any>,
  userId: string,
): Promise<BaziSnapshot> {
  const birthDate: string = profile.birth_date;
  const rawBirthTime: string = profile.birth_time || '12:00:00';
  const timeUnknown = !profile.birth_time;
  const isMinuteUnknown = profile.is_minute_unknown === true;
  const dateStr = `${birthDate}T${rawBirthTime}`;
  const lat: number = profile.birth_lat || 39.9042;
  const lng: number = profile.birth_lng || 116.4074;

  // 1. 调用通用的时间引擎处理宇宙坐标
  const timeResult = calculateUniversalTime({
    dateStr,
    lat,
    lng,
    timeUnknown,
    minuteUnknown: isMinuteUnknown,
    timezone: profile.birth_timezone || undefined,
  });

  // 2. 将计算好的时间标准对象交给纯净的八字引擎
  let baziResult: ReturnType<typeof baziEngine.calculate>;
  try {
    baziResult = baziEngine.calculate(timeResult);
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

  await baziRepo.insertSnapshotForProfile(profile.id, userId, snapshot);

  return snapshot;
}
