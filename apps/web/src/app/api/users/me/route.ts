import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const HANDLE_REGEX = /^[a-zA-Z0-9_]{3,30}$/;

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json() as { display_name?: string; handle?: string };

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
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('handle', handle)
        .neq('id', user.id)
        .maybeSingle();
      if (existing) {
        return NextResponse.json({ error: 'handle_taken' }, { status: 409 });
      }
      updates.handle = handle;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, updates });
  } catch (error) {
    console.error('[users/me PATCH] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}