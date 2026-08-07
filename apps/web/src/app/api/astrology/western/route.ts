import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth/requireAuth';
import { createWesternRepository } from '@/lib/western/adminClient';
import { calculateStarChart } from '@mindo/core';
import type { WesternFullModeInput, WesternDateModeInput } from '@mindo/core';

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireApiUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { profile_id } = body;

    if (!profile_id) {
      return NextResponse.json({ error: 'Missing profile_id' }, { status: 400 });
    }

    const westernRepo = createWesternRepository(supabase);

    const profile = await westernRepo.getOwnedProfile(profile_id, user.id);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const existing = await westernRepo.getSnapshot(profile_id);

    if (existing) {
      return NextResponse.json({ result: existing.calculation_result, fromCache: true });
    }

    const birthDate = profile.birth_date;
    const [year, month, day] = birthDate.split('-').map(Number);

    const timezoneOffset = profile.birth_lng
      ? Math.round(profile.birth_lng / 15)
      : 0;

    let input: WesternFullModeInput | WesternDateModeInput;

    if (
      profile.birth_time &&
      profile.birth_lat !== null &&
      profile.birth_lng !== null
    ) {
      const [hour, minute] = profile.birth_time.split(':').map(Number);
      input = {
        year, month, day,
        hour, minute,
        lat: profile.birth_lat,
        lng: profile.birth_lng,
        timezoneOffset,
      };
    } else {
      input = { year, month, day, timezoneOffset };
    }

    const result = calculateStarChart(input);

    await westernRepo.insertSnapshot(profile_id, user.id, result);

    return NextResponse.json({ result, fromCache: false });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Western astrology API error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
