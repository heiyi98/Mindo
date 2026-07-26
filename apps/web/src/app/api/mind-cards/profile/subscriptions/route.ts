import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { mindCardsAdminClient as admin } from '@/lib/mindCards/adminClient';
import { isCardVisible, fetchRelationFlags, type RelationFlags } from '@/lib/mindCards/visibility';
import { fetchLatestCardByFolder } from '@/lib/mindCards/folderCover';

const EMPTY_RELATION: RelationFlags = { viewerFollowsAuthor: false, authorFollowsViewer: false };

interface FolderRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  folder_kind: string;
  display_mode: string | null;
  visibility: string;
  is_default: boolean;
}

// GET /api/mind-cards/profile/subscriptions?userId= — 目标用户订阅的所有卡片夹，"订阅卡片夹"栏
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('userId') ?? user.id;

    const { data: rows, error } = await admin
      .from('mind_card_folder_subscriptions')
      .select('created_at, mind_card_folders(id, user_id, name, description, folder_kind, display_mode, visibility, is_default)')
      .eq('subscriber_id', targetUserId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[mind-cards/profile/subscriptions GET] error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    let folders = (rows ?? [])
      .map((r) => r.mind_card_folders as unknown as FolderRow | null)
      .filter((f): f is FolderRow => f !== null);

    // 目标用户不是本人时，订阅的夹仍需对请求方(viewer)可见，避免借订阅列表暴露第三方私密夹的存在
    if (targetUserId !== user.id) {
      const ownerIds = [...new Set(folders.map((f) => f.user_id))];
      const relations = await fetchRelationFlags(admin, user.id, ownerIds);
      folders = folders.filter((f) =>
        isCardVisible(f.user_id, f.visibility, user.id, relations.get(f.user_id) ?? EMPTY_RELATION)
      );
    }

    const folderIds = folders.map((f) => f.id);
    const coverByFolder = await fetchLatestCardByFolder(admin, folderIds);

    const result = folders.map((f) => ({ ...f, latest_card: coverByFolder.get(f.id) ?? null }));

    return NextResponse.json({ folders: result });
  } catch (error) {
    console.error('[mind-cards/profile/subscriptions GET] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
