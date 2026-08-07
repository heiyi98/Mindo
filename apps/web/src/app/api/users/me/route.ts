import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth/requireAuth';
import { createSocialRepository } from '@/lib/social/adminClient';

const HANDLE_REGEX = /^[a-zA-Z0-9_]{3,30}$/;

export async function PATCH(request: Request) {
  try {
    const { supabase, user } = await requireApiUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json() as { display_name?: string; handle?: string };
    const socialRepo = createSocialRepository(supabase);

    const updates: Record<string, string> = {};

    if (body.display_name !== undefined) {
      const name = body.display_name.trim();
      if (name.length > 50) {
        return NextResponse.json({ error: 'display_name_too_long' }, { status: 400 });
      }
      updates.display_name = name;
    }

    if (body.handle !== undefined) {
      const handle = body.handle.trim().toLowerCase();
      if (!HANDLE_REGEX.test(handle)) {
        return NextResponse.json({ error: 'handle_invalid' }, { status: 400 });
      }
      // 检查唯一性
      const taken = await socialRepo.isHandleTaken(handle, user.id);
      if (taken) {
        return NextResponse.json({ error: 'handle_taken' }, { status: 409 });
      }
      updates.handle = handle;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { error } = await socialRepo.updateUserProfile(user.id, updates);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, updates });
  } catch (error) {
    console.error('[users/me PATCH] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
