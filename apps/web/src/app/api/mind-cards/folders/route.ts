import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { mindCardsAdminClient as admin } from '@/lib/mindCards/adminClient';
import type { CardVisibility } from '@/lib/mindCards/visibility';

const VALID_VISIBILITY: CardVisibility[] = ['private', 'followers', 'friends', 'public'];
const VALID_DISPLAY_MODES = ['album', 'stack'] as const;
const VALID_FOLDER_KINDS = ['collection', 'notebook'] as const;

// POST /api/mind-cards/folders — 新建卡片夹。接受 folder_kind='collection'（卡册/卡夹，
// 需要 display_mode）或 'notebook'（本，不看 display_mode——"本"固定使用左卡片右批语
// 的布局，不需要在album/stack之间选）。
// is_default 永远由后端强制为 false——用户不能自建第二个默认夹。
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json() as {
      name?: string;
      folder_kind?: string;
      display_mode?: string;
      visibility?: string;
      description?: string;
    };

    const name = body.name?.trim();
    if (!name) return NextResponse.json({ error: 'Missing name' }, { status: 400 });

    if (!body.folder_kind || !VALID_FOLDER_KINDS.includes(body.folder_kind as typeof VALID_FOLDER_KINDS[number])) {
      return NextResponse.json({ error: 'Invalid folder_kind' }, { status: 400 });
    }
    const folderKind = body.folder_kind as typeof VALID_FOLDER_KINDS[number];

    if (folderKind === 'collection') {
      if (!body.display_mode || !VALID_DISPLAY_MODES.includes(body.display_mode as typeof VALID_DISPLAY_MODES[number])) {
        return NextResponse.json({ error: 'Invalid display_mode' }, { status: 400 });
      }
    }

    if (!body.visibility || !VALID_VISIBILITY.includes(body.visibility as CardVisibility)) {
      return NextResponse.json({ error: 'Invalid visibility' }, { status: 400 });
    }

    const { count } = await admin
      .from('mind_card_folders')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const { data: folder, error } = await admin
      .from('mind_card_folders')
      .insert({
        user_id: user.id,
        name,
        description: body.description?.trim() || null,
        folder_kind: folderKind,
        display_mode: folderKind === 'collection' ? body.display_mode : null,
        visibility: body.visibility,
        is_default: false,
        order_index: count ?? 0,
      })
      .select('id, name, description, folder_kind, display_mode, visibility, is_default, order_index, created_at')
      .single();

    if (error || !folder) {
      console.error('[mind-cards/folders POST] error:', error);
      return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 });
    }

    return NextResponse.json({ folder });
  } catch (error) {
    console.error('[mind-cards/folders POST] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
