import { NextResponse } from 'next/server';
import { engine } from '@mindo/core';
import { energyEngine } from '@mindo/core';

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

    const energyScores = energyEngine.calculateStaticEnergy({
      year: { stem: baziResult.pillars.year.stem, branch: baziResult.pillars.year.branch },
      month: { stem: baziResult.pillars.month.stem, branch: baziResult.pillars.month.branch },
      day: { stem: baziResult.pillars.day.stem, branch: baziResult.pillars.day.branch },
      hour: { stem: baziResult.pillars.hour.stem || 'Jia', branch: baziResult.pillars.hour.branch || 'Zi' },
    });

    const dayStem = baziResult.pillars.day.stem;

    return NextResponse.json({
      dayStem,
      pillars: baziResult.pillars,
      energyScores,
      meta: baziResult.meta,
    });
  } catch (error) {
    console.error('Bazi calculate error:', error);
    return NextResponse.json({ error: 'Calculation failed' }, { status: 500 });
  }
}
