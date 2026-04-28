import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateBigFiveWithLocale } from '@mindo/core';
import type { BigFiveUserAnswer } from '@mindo/core';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { answers, profile_id, locale } = body as {
      answers: BigFiveUserAnswer[];
      profile_id: string;
      locale: string;
    };

    if (!answers || !profile_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', profile_id)
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const { data: existing } = await supabase
      .from('snapshots')
      .select('id, calculation_result')
      .eq('profile_id', profile_id)
      .eq('snapshot_type', 'bigfive')
      .single();

    if (existing) {
      return NextResponse.json({
        result: existing.calculation_result,
        fromCache: true,
      });
    }

    const report = calculateBigFiveWithLocale(answers, locale || 'en');

    await supabase.from('snapshots').insert({
      profile_id,
      user_id: user.id,
      snapshot_type: 'bigfive',
      input_hash: `bigfive_${profile_id}`,
      calculation_result: report,
    });

    return NextResponse.json({ result: report, fromCache: false });
  } catch (error: any) {
    console.error('BigFive API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
