import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ handle: string }> }
) {
  try {
    const { handle } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: target } = await supabase
      .from('users')
      .select('id, handle, display_name')
      .eq('handle', handle)
      .single();

    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user: target });
  } catch (error) {
    console.error('[users/handle] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}