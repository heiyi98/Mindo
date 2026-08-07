import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth/requireAuth';
import { createSocialRepository } from '@/lib/social/adminClient';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ handle: string }> }
) {
  try {
    const { handle } = await params;
    const { supabase, user } = await requireApiUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const target = await createSocialRepository(supabase).getUserByHandle(handle);

    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user: target });
  } catch (error) {
    console.error('[users/handle] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
