import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

const adminClient = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/psychology/bigfive/import
// body: { assessment_id: string, profile_id: string }
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { assessment_id, profile_id } = await request.json() as {
      assessment_id: string;
      profile_id: string;
    };

    if (!assessment_id?.trim() || !profile_id) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // 验证目标档案属于当前用户
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', profile_id)
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // 查源记录（任何人的都可以，用 admin 绕过 RLS）
    const { data: source } = await adminClient
      .from('bigfive_assessments')
      .select('domain_scores, facet_scores, region_country, region_level1, region_level2, region_level3, region_display_name, age_group, gender')
      .eq('id', assessment_id.trim())
      .single();

    if (!source) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    // 查当前用户自己的 display_name 和 handle
    const { data: selfProfile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', user.id)
      .eq('is_self', true)
      .single();

    const { data: userData } = await supabase
      .from('users')
      .select('handle, display_name')
      .eq('id', user.id)
      .single();

    // 查目标档案的 display_name
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', profile_id)
      .single();

    // 插入新记录
    const { data: inserted, error: insertError } = await supabase
      .from('bigfive_assessments')
      .insert({
        profile_id,
        user_id: user.id,
        domain_scores: source.domain_scores,
        facet_scores: source.facet_scores,
        region_country: source.region_country,
        region_level1: source.region_level1,
        region_level2: source.region_level2,
        region_level3: source.region_level3,
        region_display_name: source.region_display_name,
        age_group: source.age_group,
        gender: source.gender,
        profile_display_name: targetProfile?.display_name ?? null,
        user_display_name: selfProfile?.display_name ?? userData?.display_name ?? null,
        user_handle: userData?.handle ?? null,
      })
      .select('id')
      .single();

    if (insertError || !inserted) {
      console.error('[bigfive/import] insert error:', insertError);
      return NextResponse.json({ error: 'Failed to import' }, { status: 500 });
    }

    // 删除目标档案的旧记录（保留刚插入的）
    await adminClient
      .from('bigfive_assessments')
      .delete()
      .eq('profile_id', profile_id)
      .neq('id', inserted.id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[bigfive/import] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}