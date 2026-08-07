import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth/requireAuth';
import { mindCardsAdminClient as admin, mindCardsRepository as repo } from '@/lib/mindCards/adminClient';
import { isCardVisible, fetchRelationFlags, type RelationFlags } from '@/lib/mindCards/visibility';
import { fetchLatestCardByFolder } from '@/lib/mindCards/folderCover';

const EMPTY_RELATION: RelationFlags = { viewerFollowsAuthor: false, authorFollowsViewer: false };

// GET /api/mind-cards/profile/folders?userId= — 目标用户名下所有卡片夹（含收藏夹，混排），"卡片夹"栏
export async function GET(request: Request) {
  try {
    const { user } = await requireApiUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('userId') ?? user.id;

    const rawFolders = await repo.listFoldersByOwner(targetUserId);

    let visibleFolders = rawFolders;
    if (targetUserId !== user.id) {
      const relations = await fetchRelationFlags(admin, user.id, [targetUserId]);
      const relation = relations.get(targetUserId) ?? EMPTY_RELATION;
      visibleFolders = visibleFolders.filter((f) => isCardVisible(targetUserId, f.visibility, user.id, relation));
    }

    const folderIds = visibleFolders.map((f) => f.id);
    const coverByFolder = await fetchLatestCardByFolder(admin, folderIds);

    const folders = visibleFolders.map((f) => ({ ...f, latest_card: coverByFolder.get(f.id) ?? null }));

    return NextResponse.json({ folders });
  } catch (error) {
    console.error('[mind-cards/profile/folders GET] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
