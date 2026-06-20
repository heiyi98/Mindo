import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

const adminClient = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/users/search?q=xxx
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim();

    if (!q || q.length < 1) {
      return NextResponse.json({ users: [] });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 用 admin 绕过 RLS，搜索 handle 或 display_name
    const { data } = await adminClient
      .from('users')
      .select('id, handle, display_name')
      .or(`handle.ilike.%${q}%,display_name.ilike.%${q}%`)
      .neq('id', user.id)
      .limit(10);

    return NextResponse.json({ users: data ?? [] });
  } catch (error) {
    console.error('[users/search] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}