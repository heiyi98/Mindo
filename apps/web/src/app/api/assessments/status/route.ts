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

  // Query each dedicated table in parallel
  const [baziRes, westernRes, bigfiveRes] = await Promise.all([
    supabase
      .from('bazi_snapshots')
      .select('id, ai_reading')
      .eq('profile_id', profileId)
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

  const completionMap: Record<string, { isCompleted: boolean; hasAiReading: boolean }> = {
    bazi:    { isCompleted: !!baziRes.data,    hasAiReading: !!baziRes.data?.ai_reading },
    western: { isCompleted: !!westernRes.data, hasAiReading: !!westernRes.data?.ai_reading },
    bigfive: { isCompleted: !!bigfiveRes.data, hasAiReading: false },
  };

  const status = ASSESSMENTS.map(assessment => {
    const completion = completionMap[assessment.id] ?? { isCompleted: false, hasAiReading: false };
    return {
      id: assessment.id,
      category: assessment.category,
      isAvailable: assessment.isAvailable,
      isCompleted: completion.isCompleted,
      hasAiReading: completion.hasAiReading,
    };
  });

  return NextResponse.json({ status });
}
