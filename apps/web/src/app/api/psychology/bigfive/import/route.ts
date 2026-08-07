import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth/requireAuth';
import { createBigfiveRepository } from '@/lib/bigfive/adminClient';

// POST /api/psychology/bigfive/import
// body: { assessment_id: string, profile_id: string }
export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireApiUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { assessment_id, profile_id } = await request.json() as {
      assessment_id: string;
      profile_id: string;
    };

    if (!assessment_id?.trim() || !profile_id) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const bigfiveRepo = createBigfiveRepository(supabase);

    // 验证目标档案属于当前用户
    const profile = await bigfiveRepo.getOwnedProfileForAssessment(profile_id, user.id);
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // 查源记录（任何人的都可以，仓库内部用 admin 绕过 RLS）
    const source = await bigfiveRepo.getAssessmentSourceById(assessment_id.trim());
    if (!source) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const [selfDisplayName, userData, targetDisplayName] = await Promise.all([
      bigfiveRepo.getSelfProfileDisplayName(user.id),
      bigfiveRepo.getUserHandleAndName(user.id),
      bigfiveRepo.getProfileDisplayName(profile_id),
    ]);

    // 插入新记录
    const { data: inserted, error: insertError } = await bigfiveRepo.insertAssessment({
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
      profile_display_name: targetDisplayName,
      user_display_name: selfDisplayName ?? userData?.display_name ?? null,
      user_handle: userData?.handle ?? null,
    });

    if (insertError || !inserted) {
      console.error('[bigfive/import] insert error:', insertError);
      return NextResponse.json({ error: 'Failed to import' }, { status: 500 });
    }

    // 删除目标档案的旧记录（保留刚插入的）
    await bigfiveRepo.deleteOldAssessments(profile_id, inserted.id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[bigfive/import] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
