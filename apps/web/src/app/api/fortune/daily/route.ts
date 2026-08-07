import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth/requireAuth';
import { createBaziRepository } from '@/lib/bazi/adminClient';
import {
  computeFortuneImbalance, getMonthPillar, getDayPillar,
} from '@mindo/core';
import type { BaziSnapshot, LinPillar, YearScore } from '@mindo/core';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get('profileId');
    const dateStr   = searchParams.get('date'); // YYYY-MM-DD

    if (!profileId) {
      return NextResponse.json({ error: 'profileId is required' }, { status: 400 });
    }

    const { supabase, user } = await requireApiUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 解析日期（默认今天）
    const target = dateStr ? new Date(dateStr) : new Date();
    const year  = target.getFullYear();
    const month = target.getMonth() + 1;
    const day   = target.getDate();

    const baziRepo = createBaziRepository(supabase);

    // 加载八字快照
    const snapshotRow = await baziRepo.getSnapshotForDashboard(profileId);
    if (!snapshotRow) {
      return NextResponse.json({ error: 'No bazi snapshot found' }, { status: 404 });
    }
    const natal = snapshotRow.calculation_result as BaziSnapshot;

    // 加载人生K线（含大运流年）
    const timelineRow = await baziRepo.getLifeTimeline(profileId);
    if (!timelineRow) {
      return NextResponse.json({ error: 'life_timeline not found — call /api/dashboard first' }, { status: 404 });
    }
    const years = timelineRow.years as YearScore[];

    const yearRecord = years.find(y => y.year === year);
    if (!yearRecord) {
      return NextResponse.json({ error: `No year record for ${year}` }, { status: 404 });
    }

    // 组装四柱临入
    const dayun:   LinPillar = { stem: yearRecord.dayunStem,   branch: yearRecord.dayunBranch   };
    const liuyear: LinPillar = { stem: yearRecord.liuyearStem, branch: yearRecord.liuyearBranch };
    const liuyue:  LinPillar = getMonthPillar(year, month);
    const liuri:   LinPillar = getDayPillar(year, month, day);

    const result = computeFortuneImbalance(natal, [dayun, liuyear, liuyue, liuri]);

    return NextResponse.json({
      date:    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      imbalance:  result.imbalance,
      energies:   result.energies,
      dayun,
      liuyear,
      liuyue,
      liuri,
    });
  } catch (error) {
    console.error('[fortune/daily] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
