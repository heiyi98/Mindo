import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth/requireAuth';
import { paymentsRepository } from '@/lib/payments/adminClient';
import { createBaziRepository } from '@/lib/bazi/adminClient';
import { computeConstitution, buildManualBaziSnapshot } from '@mindo/core';
import type { BaziSnapshot } from '@mindo/core';

function isNewFormatSnapshot(calcResult: any): boolean {
  return (
    calcResult?.pillars?.yuelingWuxing !== undefined &&
    calcResult?.relations !== undefined &&
    calcResult?.influence !== undefined
  );
}

export async function POST(request: Request) {
  const { supabase, user } = await requireApiUser();
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const { data: proRow } = await paymentsRepository.getUserProExpiry(user.id);
  const isProActive = !!proRow?.pro_expires_at && new Date(proRow.pro_expires_at).getTime() > Date.now();
  if (!isProActive) return NextResponse.json({ error: '需要Pro权限' }, { status: 403 });

  const body = await request.json();
  const { mode } = body;

  let snapshot: BaziSnapshot;

  if (mode === 'profile') {
    const { profileId } = body;
    if (!profileId) return NextResponse.json({ error: '缺少profileId' }, { status: 400 });

    const baziRepo = createBaziRepository(supabase);
    const existing = await baziRepo.getSnapshotForDashboard(profileId);

    if (!existing || !isNewFormatSnapshot(existing.calculation_result)) {
      return NextResponse.json(
        { error: '该档案还没有可用的命盘数据，请先在测算中心打开一次八字模块' },
        { status: 422 }
      );
    }

    snapshot = existing.calculation_result as BaziSnapshot;
  } else if (mode === 'manual') {
    const { year, month, day, hour, minute } = body;
    if (
      !Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day) ||
      !Number.isInteger(hour) || !Number.isInteger(minute)
    ) {
      return NextResponse.json({ error: '出生年月日时分必须完整' }, { status: 400 });
    }

    snapshot = buildManualBaziSnapshot({ year, month, day, hour, minute });
  } else {
    return NextResponse.json({ error: '未知的mode' }, { status: 400 });
  }

  const regular = computeConstitution(snapshot, 'regular');
  const ziping = computeConstitution(snapshot, 'ziping');

  return NextResponse.json({
    pillars: snapshot.pillars,
    dayStem: snapshot.dayStem,
    regular,
    ziping,
  });
}
