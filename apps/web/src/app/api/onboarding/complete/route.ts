import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth/requireAuth';
import { createAccountRepository } from '@/lib/account/adminClient';

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireApiUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { birth_date, birth_time, birth_lat, birth_lng, birth_place_name, birth_timezone, gender } = body;

    if (!birth_date) {
      return NextResponse.json({ error: 'birth_date is required' }, { status: 400 });
    }

    const { error: profileError } = await createAccountRepository(supabase).upsertSelfProfile(
      user.id,
      user.email?.split('@')[0] || 'User',
      {
        birth_date,
        birth_time: birth_time || null,
        birth_lat: birth_lat || null,
        birth_lng: birth_lng || null,
        birth_place_name: birth_place_name || null,
        birth_timezone: birth_timezone || null,
        gender: gender || null,
      }
    );

    if (profileError) {
      console.error('Profile insert error:', profileError);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Onboarding complete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
