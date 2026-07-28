import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ASSESSMENTS } from '@/config/assessments';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get('profile_id');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!profileId) {
    return NextResponse.json({ error: 'profile_id required' }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', profileId)
    .eq('user_id', user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const [baziSnapshotRes, baziReadingRes, westernRes, bigfiveRes] = await Promise.all([
    supabase
      .from('bazi_snapshots')
      .select('id')
      .eq('profile_id', profileId)
      .maybeSingle(),
    // 取最新的bazi_readings记录（报告可能有多个，取最新）
    supabase
      .from('bazi_readings')
      .select('id, ai_reading_theme1, ai_reading_status')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('astrology_snapshots')
      .select('id, ai_reading')
      .eq('profile_id', profileId)
      .maybeSingle(),
    supabase
      .from('bigfive_assessments')
      .select('id')
      .eq('profile_id', profileId)
      .maybeSingle(),
  ]);

  const completionMap: Record<string, {
    isCompleted: boolean
    hasAiReading: boolean
    snapshotId: string | null
    readingId: string | null
  }> = {
    bazi: {
      isCompleted: !!baziSnapshotRes.data,
      hasAiReading: !!baziReadingRes.data?.ai_reading_theme1,
      snapshotId: baziSnapshotRes.data?.id ?? null,
      readingId: baziReadingRes.data?.id ?? null,
    },
    western: {
      isCompleted: !!westernRes.data,
      hasAiReading: !!westernRes.data?.ai_reading,
      snapshotId: westernRes.data?.id ?? null,
      readingId: null,
    },
    bigfive: {
      isCompleted: !!bigfiveRes.data,
      hasAiReading: false,
      snapshotId: bigfiveRes.data?.id ?? null,
      readingId: null,
    },
  };

  const status = ASSESSMENTS.map(assessment => {
    const completion = completionMap[assessment.id] ?? {
      isCompleted: false,
      hasAiReading: false,
      snapshotId: null,
      readingId: null,
    };
    return {
      id: assessment.id,
      category: assessment.category,
      isAvailable: assessment.isAvailable,
      isCompleted: completion.isCompleted,
      hasAiReading: completion.hasAiReading,
      snapshotId: completion.snapshotId,
      readingId: completion.readingId,
    };
  });

  return NextResponse.json({ status });
}