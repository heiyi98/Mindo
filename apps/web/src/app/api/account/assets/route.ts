import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth/requireAuth';
import { createAccountRepository } from '@/lib/account/adminClient';

// 从报告自留的命盘快照里解析出真太阳时，只在服务端做这件事——
// calculation_result 是整份命盘计算结果，体积不小，列表页只需要
// "时:分"这一个短字符串，没必要把整份 JSON 发到浏览器里。
function extractSolarTime(calculationResult: any): string | null {
  const raw: string | undefined = calculationResult?.meta?.solarTime;
  if (!raw) return null;
  const match = raw.match(/(\d{2}:\d{2})/);
  return match ? match[1] : null;
}

export async function GET() {
  const { supabase, user } = await requireApiUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const baziReadings = await createAccountRepository(supabase).listBaziAssets(user.id);

  const assets = baziReadings.map(r => ({
    id: r.id,
    type: 'bazi',
    profile_id: r.profile_id,
    profile_display_name: r.profile_display_name,
    birth_date: r.birth_date,
    birth_place_name: r.birth_place_name,
    solar_time: extractSolarTime(r.calculation_result),
    ai_reading_status: r.ai_reading_status,
    created_at: r.created_at,
  }));

  return NextResponse.json({ assets });
}
