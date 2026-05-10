import { NextResponse } from 'next/server';
import { engine, analyzeBazi } from '@mindo/core';
import type { TianGan, DiZhi, Wuxing } from '@mindo/core';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { birthYear, birthMonth, birthDay, birthHour, birthMinute, birthLat, birthLng } = body;

    if (!birthYear || !birthMonth || !birthDay) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const hour = birthHour ?? 12;
    const minute = birthMinute ?? 0;
    const lat = birthLat ?? 39.9042;
    const lng = birthLng ?? 116.4074;
    const timeUnknown = birthHour === null;

    const dateStr = `${birthYear}-${String(birthMonth).padStart(2,'0')}-${String(birthDay).padStart(2,'0')}T${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}:00`;

    const baziResult = engine.calculate({ dateStr, lat, lng, timeUnknown });

    const analysis = analyzeBazi({
      year:  { stem: baziResult.pillars.year.stem as TianGan,  branch: baziResult.pillars.year.branch as DiZhi  },
      month: { stem: baziResult.pillars.month.stem as TianGan, branch: baziResult.pillars.month.branch as DiZhi },
      day:   { stem: baziResult.pillars.day.stem as TianGan,   branch: baziResult.pillars.day.branch as DiZhi   },
      hour:  {
        stem:   (baziResult.pillars.hour.stem || 'Jia') as TianGan,
        branch: (baziResult.pillars.hour.branch || 'Zi') as DiZhi,
      },
    });

    const energyScores: Record<Wuxing, number> = { Wood: 0, Fire: 0, Earth: 0, Metal: 0, Water: 0 };
    for (const node of analysis.energyNodes) {
      if (node.outputEnabled) energyScores[node.wuxing] += node.energy;
    }

    return NextResponse.json({
      dayStem: baziResult.pillars.day.stem,
      pillars: baziResult.pillars,
      energyScores,
      meta: baziResult.meta,
      analysis,
    });
  } catch (error) {
    console.error('Bazi calculate error:', error);
    return NextResponse.json({ error: 'Calculation failed' }, { status: 500 });
  }
}
