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
    // 默认排除自己（"加好友"场景不该搜到自己）；"直接发放"这类管理员操作场景
    // 需要搜到自己（给自己账号发测试额度），显式传excludeSelf=false跳过这条过滤，
    // 不改动这个接口原本对私信模块的默认行为
    const excludeSelf = searchParams.get('excludeSelf') !== 'false';

    if (!q || q.length < 1) {
      return NextResponse.json({ users: [] });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 用 admin 绕过 RLS，搜索 handle 或 display_name
    let query = adminClient
      .from('users')
      .select('id, handle, display_name')
      .or(`handle.ilike.%${q}%,display_name.ilike.%${q}%`)
      .limit(10);

    if (excludeSelf) {
      query = query.neq('id', user.id);
    }

    const { data } = await query;

    return NextResponse.json({ users: data ?? [] });
  } catch (error) {
    console.error('[users/search] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}