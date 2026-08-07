import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth/requireAuth';
import { mindCardsRepository as repo } from '@/lib/mindCards/adminClient';
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
    const { user } = await requireApiUser();
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

    const count = await repo.countOwnFolders(user.id);

    const { data: folder, error } = await repo.insertFolder({
      user_id: user.id,
      name,
      description: body.description?.trim() || null,
      folder_kind: folderKind,
      display_mode: folderKind === 'collection' ? (body.display_mode as string) : null,
      visibility: body.visibility,
      order_index: count,
    });

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
