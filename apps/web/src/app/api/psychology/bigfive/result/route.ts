import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

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

interface NormRow {
  statistics: Record<string, unknown>;
  sample_size: number;
  region_country: string | null;
  region_level1: string | null;
  region_level2: string | null;
  region_level3: string | null;
  gender: string | null;
  age_group: string | null;
}

interface NormParams {
  region_country: string | null;
  region_level1: string | null;
  region_level2: string | null;
  region_level3: string | null;
  gender: string | null;
  age_group: string | null;
}

function applyNullableFilter(query: any, column: string, value: string | null) {
  return value === null
    ? query.is(column, null)
    : query.eq(column, value);
}

async function matchNorm(supabase: SupabaseClient, params: NormParams): Promise<NormRow | null> {
  const { region_country: country, region_level1: level1, region_level2: level2, region_level3: level3, gender, age_group } = params;

  const candidates = [
    { rc: country, rl1: level1, rl2: level2, rl3: level3, g: gender, ag: age_group },
    { rc: country, rl1: level1, rl2: level2, rl3: level3, g: gender, ag: null },
    { rc: country, rl1: level1, rl2: level2, rl3: level3, g: null,   ag: null },
    { rc: country, rl1: level1, rl2: level2, rl3: null,   g: gender, ag: age_group },
    { rc: country, rl1: level1, rl2: level2, rl3: null,   g: gender, ag: null },
    { rc: country, rl1: level1, rl2: level2, rl3: null,   g: null,   ag: null },
    { rc: country, rl1: level1, rl2: null,   rl3: null,   g: gender, ag: age_group },
    { rc: country, rl1: level1, rl2: null,   rl3: null,   g: gender, ag: null },
    { rc: country, rl1: level1, rl2: null,   rl3: null,   g: null,   ag: null },
    { rc: country, rl1: null,   rl2: null,   rl3: null,   g: gender, ag: age_group },
    { rc: country, rl1: null,   rl2: null,   rl3: null,   g: gender, ag: null },
    { rc: country, rl1: null,   rl2: null,   rl3: null,   g: null,   ag: null },
    { rc: null,    rl1: null,   rl2: null,   rl3: null,   g: gender, ag: age_group },
    { rc: null,    rl1: null,   rl2: null,   rl3: null,   g: gender, ag: null },
    { rc: null,    rl1: null,   rl2: null,   rl3: null,   g: null,   ag: null },
  ];

  for (const c of candidates) {
    let query = supabase.from('bigfive_norms').select('*');
    query = applyNullableFilter(query, 'region_country', c.rc);
    query = applyNullableFilter(query, 'region_level1',  c.rl1);
    query = applyNullableFilter(query, 'region_level2',  c.rl2);
    query = applyNullableFilter(query, 'region_level3',  c.rl3);
    query = applyNullableFilter(query, 'gender',         c.g);
    query = applyNullableFilter(query, 'age_group',      c.ag);
    const { data } = await query.maybeSingle();
    if (data && (data as NormRow).sample_size > 0) return data as NormRow;
  }

  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get('profileId') || searchParams.get('profile_id');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!profileId) {
    return NextResponse.json({ error: 'profileId required' }, { status: 400 });
  }

  const { data: assessment } = await supabase
    .from('bigfive_assessments')
    .select('*')
    .eq('profile_id', profileId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!assessment) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const norm = await matchNorm(supabase, {
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
      const rawScore = (assessment.domain_scores as Record<string, number>)[letterKey];
      if (stats[key] && rawScore != null) {
        domains[key] = toStandardEntry(rawScore, stats[key].mean, stats[key].std);
      }
    }

    const facets: Record<string, object> = {};
    for (const [key, val] of Object.entries(assessment.facet_scores as Record<string, number>)) {
      const normKey = key.toUpperCase();
      if (stats[normKey] && val != null) {
        facets[key] = toStandardEntry(val, stats[normKey].mean, stats[normKey].std);
      }
    }

    standard_scores = { domains, facets };
  }

  return NextResponse.json({
    id: assessment.id,              // ← 新增
    domain_scores: assessment.domain_scores as Record<string, number>,
    facet_scores: assessment.facet_scores as Record<string, number>,
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

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!profileId) {
    return NextResponse.json({ error: 'profileId required' }, { status: 400 });
  }

  await supabase
    .from('bigfive_assessments')
    .delete()
    .eq('profile_id', profileId)
    .eq('user_id', user.id);

  return NextResponse.json({ success: true });
}