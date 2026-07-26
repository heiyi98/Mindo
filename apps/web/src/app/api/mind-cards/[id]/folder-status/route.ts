import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { mindCardsAdminClient as admin } from '@/lib/mindCards/adminClient';

// GET /api/mind-cards/:id/folder-status — 多选窗口用：当前用户所有卡片夹 + 该卡片在哪些夹里
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cardId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: folders, error: foldersError } = await admin
      .from('mind_card_folders')
      .select('id, name, folder_kind, display_mode, is_default')
      .eq('user_id', user.id)
      .order('order_index', { ascending: true });

    if (foldersError) {
      console.error('[mind-cards folder-status GET] folders error:', foldersError);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    const folderIds = (folders ?? []).map((f) => f.id);
    let checkedIds = new Set<string>();
    if (folderIds.length > 0) {
      const { data: items } = await admin
        .from('mind_card_folder_items')
        .select('folder_id')
        .eq('card_id', cardId)
        .in('folder_id', folderIds);
      checkedIds = new Set((items ?? []).map((i) => i.folder_id));
    }

    const result = (folders ?? []).map((f) => ({ ...f, checked: checkedIds.has(f.id) }));
    return NextResponse.json({ folders: result });
  } catch (error) {
    console.error('[mind-cards folder-status GET] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
