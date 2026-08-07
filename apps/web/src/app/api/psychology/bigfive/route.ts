import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth/requireAuth';
import { createBigfiveRepository } from '@/lib/bigfive/adminClient';
import { calculateBigFive } from '@mindo/core';
import type { BigFiveUserAnswer } from '@mindo/core';

function calcAgeGroup(birthDate: string): string {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  if (age <= 11) return '11-';
  if (age <= 17) return '12-17';
  if (age <= 29) return '18-29';
  if (age <= 39) return '30-39';
  if (age <= 60) return '40-60';
  return '60+';
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireApiUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const {
      answers,
      profile_id,
      region_country = null,
      region_level1 = null,
      region_level2 = null,
      region_level3 = null,
      region_display_name = null,
    } = body as {
      answers: BigFiveUserAnswer[];
      profile_id: string;
      region_country?: string | null;
      region_level1?: string | null;
      region_level2?: string | null;
      region_level3?: string | null;
      region_display_name?: string | null;
    };

    if (!answers || !profile_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const bigfiveRepo = createBigfiveRepository(supabase);
    const profile = await bigfiveRepo.getOwnedProfileForAssessment(profile_id, user.id);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const age_group = profile.birth_date ? calcAgeGroup(profile.birth_date) : null;
    const report = calculateBigFive(answers);

    const domain_scores: Record<string, number> = {};
    const facet_scores: Record<string, number> = {};
    for (const d of report.domains) {
      domain_scores[d.domain] = d.score;
      for (const f of d.facets) {
        facet_scores[f.facet] = f.score;
      }
    }

    const { data: inserted, error: insertError } = await bigfiveRepo.insertAssessment({
      profile_id,
      user_id: user.id,
      domain_scores,
      facet_scores,
      region_country,
      region_level1,
      region_level2,
      region_level3,
      region_display_name,
      age_group,
      gender: profile.gender || null,
    });

    if (insertError || !inserted) {
      console.error('[BigFive] insert failed:', insertError);
      return NextResponse.json(
        { error: 'Failed to save result: ' + insertError?.message },
        { status: 500 }
      );
    }

    await bigfiveRepo.deleteOldAssessments(profile_id, inserted.id);

    return NextResponse.json({ result: report, fromCache: false });
  } catch (error: any) {
    console.error('BigFive API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
