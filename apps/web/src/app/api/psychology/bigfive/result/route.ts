import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth/requireAuth';
import { createBigfiveRepository } from '@/lib/bigfive/adminClient';

function zToLabel(z: number): '极高' | '高' | '中' | '低' | '极低' {
  if (z > 1.5) return '极高';
  if (z > 0.5) return '高';
  if (z >= -0.5) return '中';
  if (z >= -1.5) return '低';
  return '极低';
}

function toStandardEntry(raw: number, mean: number, std: number) {
  const z = (raw - mean) / std;
  const t = Math.round(Math.min(80, Math.max(20, 50 + 10 * z)));
  return { t, label: zToLabel(z), z: Math.round(z * 100) / 100 };
}

const DOMAIN_LETTER_MAP: Record<string, string> = {
  NEUROTICISM: 'N',
  EXTRAVERSION: 'E',
  OPENNESS: 'O',
  AGREEABLENESS: 'A',
  CONSCIENTIOUSNESS: 'C',
};

const DOMAIN_KEYS = ['NEUROTICISM', 'EXTRAVERSION', 'OPENNESS', 'AGREEABLENESS', 'CONSCIENTIOUSNESS'];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get('profileId') || searchParams.get('profile_id');

  const { supabase, user } = await requireApiUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!profileId) {
    return NextResponse.json({ error: 'profileId required' }, { status: 400 });
  }

  const bigfiveRepo = createBigfiveRepository(supabase);
  const assessment = await bigfiveRepo.getOwnedAssessment(profileId, user.id);

  if (!assessment) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const norm = await bigfiveRepo.matchNorm({
    region_country: assessment.region_country,
    region_level1: assessment.region_level1,
    region_level2: assessment.region_level2,
    region_level3: assessment.region_level3,
    gender: assessment.gender,
    age_group: assessment.age_group,
  });

  let standard_scores: object | null = null;
  if (norm) {
    const stats = norm.statistics as Record<string, { mean: number; std: number }>;

    const domains: Record<string, object> = {};
    for (const key of DOMAIN_KEYS) {
      const letterKey = DOMAIN_LETTER_MAP[key];
      const rawScore = assessment.domain_scores[letterKey];
      if (stats[key] && rawScore != null) {
        domains[key] = toStandardEntry(rawScore, stats[key].mean, stats[key].std);
      }
    }

    const facets: Record<string, object> = {};
    for (const [key, val] of Object.entries(assessment.facet_scores)) {
      const normKey = key.toUpperCase();
      if (stats[normKey] && val != null) {
        facets[key] = toStandardEntry(val, stats[normKey].mean, stats[normKey].std);
      }
    }

    standard_scores = { domains, facets };
  }

  return NextResponse.json({
    id: assessment.id,
    domain_scores: assessment.domain_scores,
    facet_scores: assessment.facet_scores,
    standard_scores,
    region: {
      country: assessment.region_country,
      level1: assessment.region_level1,
      level2: assessment.region_level2,
      level3: assessment.region_level3,
      display_name: assessment.region_display_name,
    },
    age_group: assessment.age_group,
    gender: assessment.gender,
    submitted_at: assessment.submitted_at,
  });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get('profileId') || searchParams.get('profile_id');

  const { supabase, user } = await requireApiUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!profileId) {
    return NextResponse.json({ error: 'profileId required' }, { status: 400 });
  }

  await createBigfiveRepository(supabase).deleteAssessment(profileId, user.id);

  return NextResponse.json({ success: true });
}
