import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  CommentRow,
  DbError,
  FolderRow,
  InsertNotificationInput,
  MindCardRow,
  MindCardsRepository,
  NotificationRow,
  MindCardsUserLite,
} from './interface';

function toDbError(error: { message: string; code?: string } | null): DbError | null {
  if (!error) return null;
  return { message: error.message, code: error.code };
}

const CARD_FIELDS = 'id, user_id, content, visibility, style, created_at';

export function createSupabaseMindCardsRepository(admin: SupabaseClient): MindCardsRepository {
  return {
    async getUserHandle(userId) {
      const { data } = await admin.from('users').select('id, handle, display_name').eq('id', userId).maybeSingle();
      return data as MindCardsUserLite | null;
    },

    async getCard(cardId) {
      const { data } = await admin.from('mind_cards').select(CARD_FIELDS).eq('id', cardId).maybeSingle();
      return data as MindCardRow | null;
    },

    async listCardsByAuthor(userId) {
      const { data } = await admin.from('mind_cards').select(CARD_FIELDS).eq('user_id', userId).order('created_at', { ascending: false });
      return (data ?? []) as MindCardRow[];
    },

    async listCardsByIds(ids) {
      const { data } = await admin.from('mind_cards').select(CARD_FIELDS).in('id', ids);
      return (data ?? []) as MindCardRow[];
    },

    async listCardsByAuthors(authorIds, cursor, limit) {
      let query = admin.from('mind_cards').select(CARD_FIELDS).in('user_id', authorIds).order('created_at', { ascending: false }).limit(limit);
      if (cursor) query = query.lt('created_at', cursor);
      const { data } = await query;
      return (data ?? []) as MindCardRow[];
    },

    async listRecentCardsExcludingUser(windowStartIso, userId) {
      const { data } = await admin
        .from('mind_cards')
        .select(CARD_FIELDS)
        .gte('created_at', windowStartIso)
        .neq('user_id', userId);
      return (data ?? []) as MindCardRow[];
    },

    async insertCard(input) {
      const { data, error } = await admin.from('mind_cards').insert(input).select(CARD_FIELDS).single();
      return { data: data as MindCardRow | null, error: toDbError(error) };
    },

    async updateCardVisibility(cardId, visibility) {
      const { data, error } = await admin
        .from('mind_cards')
        .update({ visibility })
        .eq('id', cardId)
        .select(CARD_FIELDS)
        .single();
      return { data: data as MindCardRow | null, error: toDbError(error) };
    },

    async deleteCard(cardId) {
      await admin.from('mind_cards').delete().eq('id', cardId);
    },

    async getViewedCardIds(viewerId, cardIds) {
      const { data } = await admin
        .from('mind_card_views')
        .select('card_id')
        .eq('viewer_id', viewerId)
        .in('card_id', cardIds);
      return new Set((data ?? []).map((v) => v.card_id as string));
    },

    async markCardViewed(cardId, viewerId) {
      const { error } = await admin
        .from('mind_card_views')
        .upsert(
          { card_id: cardId, viewer_id: viewerId, viewed_at: new Date().toISOString() },
          { onConflict: 'card_id,viewer_id', ignoreDuplicates: true }
        );
      return { error: toDbError(error) };
    },

    async getCardMetrics(cardIds) {
      const { data } = await admin.from('mind_card_metrics').select('card_id, metric_type, metric_data').in('card_id', cardIds);
      return (data ?? []) as { card_id: string; metric_type: string; metric_data: unknown }[];
    },

    async insertCardMetrics(rows) {
      if (rows.length === 0) return;
      const { error } = await admin.from('mind_card_metrics').insert(rows);
      if (error) console.error('[mind-cards] insert metrics error:', error);
    },

    async insertRecommendationSources(rows) {
      if (rows.length === 0) return;
      const { error } = await admin.from('mind_card_recommendation_sources').insert(rows);
      if (error) console.error('[mind-cards] insert recommendation sources error:', error);
    },

    async getFolderDetail(folderId) {
      const { data } = await admin
        .from('mind_card_folders')
        .select('id, user_id, name, description, folder_kind, display_mode, visibility, is_default')
        .eq('id', folderId)
        .single();
      return data as FolderRow | null;
    },

    async getFoldersByIds(ids) {
      if (ids.length === 0) return [];
      const { data } = await admin
        .from('mind_card_folders')
        .select('id, user_id, name, visibility, is_default')
        .in('id', ids);
      return (data ?? []) as FolderRow[];
    },

    async getFolderOwnership(folderId) {
      const { data } = await admin
        .from('mind_card_folders')
        .select('id, user_id, is_default')
        .eq('id', folderId)
        .maybeSingle();
      return data as { id: string; user_id: string; is_default: boolean } | null;
    },

    async listOwnFoldersOrdered(userId) {
      const { data } = await admin
        .from('mind_card_folders')
        .select('id, name, folder_kind, display_mode, is_default')
        .eq('user_id', userId)
        .order('order_index', { ascending: true });
      return (data ?? []) as FolderRow[];
    },

    async listFoldersByOwner(userId) {
      const { data } = await admin
        .from('mind_card_folders')
        .select('id, name, description, folder_kind, display_mode, visibility, is_default, order_index, created_at')
        .eq('user_id', userId)
        .order('order_index', { ascending: true });
      return (data ?? []) as FolderRow[];
    },

    async countOwnFolders(userId) {
      const { count } = await admin
        .from('mind_card_folders')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);
      return count ?? 0;
    },

    async insertFolder(input) {
      const { data, error } = await admin
        .from('mind_card_folders')
        .insert({ ...input, is_default: false })
        .select('id, name, description, folder_kind, display_mode, visibility, is_default, order_index, created_at')
        .single();
      return { data: data as FolderRow | null, error: toDbError(error) };
    },

    async updateFolder(folderId, updates) {
      const { data, error } = await admin
        .from('mind_card_folders')
        .update(updates)
        .eq('id', folderId)
        .select('id, name, description, folder_kind, display_mode, visibility, is_default, order_index, created_at')
        .single();
      return { data: data as FolderRow | null, error: toDbError(error) };
    },

    async deleteFolder(folderId) {
      const { error } = await admin.from('mind_card_folders').delete().eq('id', folderId);
      return { error: toDbError(error) };
    },

    async getFolderItemsWithCards(folderId) {
      const { data } = await admin
        .from('mind_card_folder_items')
        .select('added_at, annotation, mind_cards(id, user_id, visibility)')
        .eq('folder_id', folderId)
        .order('added_at', { ascending: false });
      return (data ?? []).map((r: any) => ({
        added_at: r.added_at,
        annotation: r.annotation as string | null,
        card: (r.mind_cards as { id: string; user_id: string; visibility: string } | null) ?? null,
      }));
    },

    async countFolderItem(folderId, cardId) {
      const { count } = await admin
        .from('mind_card_folder_items')
        .select('folder_id', { count: 'exact', head: true })
        .eq('card_id', cardId)
        .eq('folder_id', folderId);
      return count ?? 0;
    },

    async insertFolderItem(folderId, cardId, annotation) {
      const { error } = await admin
        .from('mind_card_folder_items')
        .insert({ folder_id: folderId, card_id: cardId, annotation });
      return { error: toDbError(error) };
    },

    async updateFolderItemAnnotation(folderId, cardId, annotation) {
      const { error } = await admin
        .from('mind_card_folder_items')
        .update({ annotation })
        .eq('folder_id', folderId)
        .eq('card_id', cardId);
      return { error: toDbError(error) };
    },

    async deleteFolderItem(folderId, cardId) {
      const { error } = await admin
        .from('mind_card_folder_items')
        .delete()
        .eq('folder_id', folderId)
        .eq('card_id', cardId);
      return { error: toDbError(error) };
    },

    async getFolderItemsForCard(cardId, folderIds) {
      if (folderIds.length === 0) return new Set();
      const { data } = await admin
        .from('mind_card_folder_items')
        .select('folder_id')
        .eq('card_id', cardId)
        .in('folder_id', folderIds);
      return new Set((data ?? []).map((i) => i.folder_id as string));
    },

    async listFolderSubscriptions(subscriberId) {
      const { data } = await admin
        .from('mind_card_folder_subscriptions')
        .select('created_at, mind_card_folders(id, user_id, name, description, folder_kind, display_mode, visibility, is_default)')
        .eq('subscriber_id', subscriberId)
        .order('created_at', { ascending: false });
      return (data ?? []).map((r: any) => ({
        created_at: r.created_at,
        folder: (r.mind_card_folders as FolderRow | null) ?? null,
      }));
    },

    async insertFolderSubscription(folderId, subscriberId) {
      const { error } = await admin
        .from('mind_card_folder_subscriptions')
        .insert({ subscriber_id: subscriberId, folder_id: folderId });
      return { error: toDbError(error) };
    },

    async deleteFolderSubscription(folderId, subscriberId) {
      const { error } = await admin
        .from('mind_card_folder_subscriptions')
        .delete()
        .eq('folder_id', folderId)
        .eq('subscriber_id', subscriberId);
      return { error: toDbError(error) };
    },

    async countComments(cardId) {
      const { count } = await admin
        .from('mind_card_comments')
        .select('id', { count: 'exact', head: true })
        .eq('card_id', cardId);
      return count ?? 0;
    },

    async listTopLevelComments(cardId) {
      const { data } = await admin
        .from('mind_card_comments')
        .select('id, author_id, content, created_at')
        .eq('card_id', cardId)
        .is('parent_comment_id', null)
        .order('created_at', { ascending: false });
      return (data ?? []) as CommentRow[];
    },

    async listReplyCountsByParents(parentIds) {
      const map = new Map<string, number>();
      if (parentIds.length === 0) return map;
      const { data } = await admin.from('mind_card_comments').select('parent_comment_id').in('parent_comment_id', parentIds);
      for (const row of data ?? []) {
        const pid = row.parent_comment_id as string;
        map.set(pid, (map.get(pid) ?? 0) + 1);
      }
      return map;
    },

    async getCommentById(commentId) {
      const { data } = await admin
        .from('mind_card_comments')
        .select('id, card_id, parent_comment_id, author_id, content, created_at')
        .eq('id', commentId)
        .maybeSingle();
      return data as (CommentRow & { card_id: string }) | null;
    },

    async listReplies(parentCommentId) {
      const { data } = await admin
        .from('mind_card_comments')
        .select('id, author_id, content, created_at, reply_to_comment_id')
        .eq('parent_comment_id', parentCommentId)
        .order('created_at', { ascending: true });
      return (data ?? []) as CommentRow[];
    },

    async getCommentsByIds(ids) {
      const map = new Map<string, CommentRow>();
      if (ids.length === 0) return map;
      const { data } = await admin.from('mind_card_comments').select('id, content, author_id, created_at').in('id', ids);
      for (const row of (data ?? []) as CommentRow[]) map.set(row.id, row);
      return map;
    },

    async insertComment(input) {
      const { data, error } = await admin
        .from('mind_card_comments')
        .insert(input)
        .select('id, content, created_at')
        .single();
      return { data: data as { id: string; content: string; created_at: string } | null, error: toDbError(error) };
    },

    async deleteComment(commentId) {
      const { error } = await admin.from('mind_card_comments').delete().eq('id', commentId);
      return { error: toDbError(error) };
    },

    async listNotifications(recipientId, limit) {
      const { data } = await admin
        .from('mind_card_notifications')
        .select('id, type, created_at, read_at, actor_id, card_id, comment_id, target_comment_id, folder_id')
        .eq('recipient_id', recipientId)
        .order('created_at', { ascending: false })
        .limit(limit);
      return (data ?? []) as NotificationRow[];
    },

    async countUnreadNotifications(recipientId) {
      const { count } = await admin
        .from('mind_card_notifications')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_id', recipientId)
        .is('read_at', null);
      return count ?? 0;
    },

    async insertNotification(input: InsertNotificationInput) {
      const { error } = await admin.from('mind_card_notifications').insert(input);
      return { error: toDbError(error) };
    },

    async markAllNotificationsRead(recipientId) {
      const { error } = await admin
        .from('mind_card_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('recipient_id', recipientId)
        .is('read_at', null);
      return { error: toDbError(error) };
    },

    async getCardStylesByIds(ids) {
      const map = new Map<string, unknown>();
      if (ids.length === 0) return map;
      const { data } = await admin.from('mind_cards').select('id, style').in('id', ids);
      for (const row of data ?? []) map.set(row.id as string, row.style);
      return map;
    },

    async listStaleCardIds(windowStartIso) {
      const { data } = await admin.from('mind_cards').select('id').lt('created_at', windowStartIso);
      return (data ?? []).map((c) => c.id as string);
    },

    async deleteViewsForCards(cardIds) {
      const { error, count } = await admin.from('mind_card_views').delete({ count: 'exact' }).in('card_id', cardIds);
      return { count: count ?? 0, error: toDbError(error) };
    },

    async getSelfProfileId(userId) {
      const { data } = await admin.from('profiles').select('id').eq('user_id', userId).eq('is_self', true).maybeSingle();
      return (data?.id as string | undefined) ?? null;
    },

    async getBaziCalculationResult(profileId) {
      const { data } = await admin.from('bazi_snapshots').select('calculation_result').eq('profile_id', profileId).maybeSingle();
      return data?.calculation_result ?? null;
    },

    async getBigfiveDomainScores(profileId, userId) {
      const { data } = await admin
        .from('bigfive_assessments')
        .select('domain_scores')
        .eq('profile_id', profileId)
        .eq('user_id', userId)
        .maybeSingle();
      return (data?.domain_scores as Record<string, number> | undefined) ?? null;
    },
  };
}
