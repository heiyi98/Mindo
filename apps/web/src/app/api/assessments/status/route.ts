import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth/requireAuth';
import { createAccountRepository } from '@/lib/account/adminClient';
import { createBaziRepository } from '@/lib/bazi/adminClient';
import { createWesternRepository } from '@/lib/western/adminClient';
import { createBigfiveRepository } from '@/lib/bigfive/adminClient';
import { ASSESSMENTS } from '@/config/assessments';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get('profile_id');

  const { supabase, user } = await requireApiUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!profileId) {
    return NextResponse.json({ error: 'profile_id required' }, { status: 400 });
  }

  const profile = await createAccountRepository(supabase).getOwnedProfile(profileId, user.id);

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const baziRepo = createBaziRepository(supabase);
  const westernRepo = createWesternRepository(supabase);
  const bigfiveRepo = createBigfiveRepository(supabase);

  const [baziSnapshot, latestReading, westernFlag, bigfiveAssessmentId] = await Promise.all([
    baziRepo.getSnapshotForDashboard(profileId),
    baziRepo.getLatestReadingSummary(profileId),
    westernRepo.getAiReadingFlag(profileId),
    bigfiveRepo.getAssessmentIdForProfile(profileId),
  ]);

  const completionMap: Record<string, {
    isCompleted: boolean
    hasAiReading: boolean
    snapshotId: string | null
    readingId: string | null
  }> = {
    bazi: {
      isCompleted: !!baziSnapshot,
      hasAiReading: !!latestReading?.ai_reading_theme1,
      snapshotId: baziSnapshot?.id ?? null,
      readingId: latestReading?.id ?? null,
    },
    western: {
      isCompleted: !!westernFlag,
      hasAiReading: !!westernFlag?.ai_reading,
      snapshotId: westernFlag?.id ?? null,
      readingId: null,
    },
    bigfive: {
      isCompleted: !!bigfiveAssessmentId,
      hasAiReading: false,
      snapshotId: bigfiveAssessmentId,
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
