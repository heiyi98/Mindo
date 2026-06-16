import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

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

async function matchNorm(
  supabase: SupabaseClient,
  params: NormParams
): Promise<{ norm: NormRow | null; label: string | null }> {
  const { region_country: rc, region_level1: r1, region_level2: r2, region_level3: r3, gender, age_group: age } = params;

  type Filter = Record<string, string | null>;
  const steps: Array<{ filter: Filter; skip: boolean; label: string }> = [
    // a. level3-gender-age
    { filter: { region_level3: r3, gender, age_group: age }, skip: !r3 || !gender || !age, label: [r3, gender, age].filter(Boolean).join('-') },
    // b. level3-gender-全age
    { filter: { region_level3: r3, gender, age_group: null }, skip: !r3 || !gender, label: [r3, gender].filter(Boolean).join('-') },
    // c. level3-全gender-全age
    { filter: { region_level3: r3, gender: null, age_group: null }, skip: !r3, label: r3 || '' },
    // d. level2-gender-age
    { filter: { region_level2: r2, gender, age_group: age }, skip: !r2 || !gender || !age, label: [r2, gender, age].filter(Boolean).join('-') },
    // e. level2-gender-全age
    { filter: { region_level2: r2, gender, age_group: null }, skip: !r2 || !gender, label: [r2, gender].filter(Boolean).join('-') },
    // f. level2-全gender-全age
    { filter: { region_level2: r2, gender: null, age_group: null }, skip: !r2, label: r2 || '' },
    // g. level1-gender-age
    { filter: { region_level1: r1, gender, age_group: age }, skip: !r1 || !gender || !age, label: [r1, gender, age].filter(Boolean).join('-') },
    // h. level1-gender-全age
    { filter: { region_level1: r1, gender, age_group: null }, skip: !r1 || !gender, label: [r1, gender].filter(Boolean).join('-') },
    // i. level1-全gender-全age
    { filter: { region_level1: r1, gender: null, age_group: null }, skip: !r1, label: r1 || '' },
    // j. country-gender-age
    { filter: { region_country: rc, gender, age_group: age }, skip: !rc || !gender || !age, label: [rc, gender, age].filter(Boolean).join('-') },
    // k. country-gender-全age
    { filter: { region_country: rc, gender, age_group: null }, skip: !rc || !gender, label: [rc, gender].filter(Boolean).join('-') },
    // l. country-全gender-全age
    { filter: { region_country: rc, gender: null, age_group: null }, skip: !rc, label: rc || '' },
    // m. 全country-gender-age
    { filter: { region_country: null, gender, age_group: age }, skip: !gender || !age, label: [gender, age].filter(Boolean).join('-') },
    // n. 全country-gender-全age
    { filter: { region_country: null, gender, age_group: null }, skip: !gender, label: gender || '' },
    // o. 全country-全gender-全age (终极兜底)
    { filter: { region_country: null, gender: null, age_group: null }, skip: false, label: 'global' },
  ];

  for (const step of steps) {
    if (step.skip) continue;
    let query = supabase.from('bigfive_norms').select('*');
    for (const [key, val] of Object.entries(step.filter)) {
      query = val === null ? query.is(key, null) : query.eq(key, val);
    }
    const { data } = await query.maybeSingle();
    if (data && (data as NormRow).sample_size > 0) {
      return { norm: data as NormRow, label: step.label };
    }
  }

  return { norm: null, label: null };
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

  const { norm, label } = await matchNorm(supabase, {
    region_country: assessment.region_country,
    region_level1: assessment.region_level1,
    region_level2: assessment.region_level2,
    region_level3: assessment.region_level3,
    gender: assessment.gender,
    age_group: assessment.age_group,
  });

  return NextResponse.json({
    domain_scores: assessment.domain_scores as Record<string, number>,
    facet_scores: assessment.facet_scores as Record<string, number>,
    standard_scores: null,
    norm_group: label,
    norm_sample_size: norm?.sample_size ?? null,
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
