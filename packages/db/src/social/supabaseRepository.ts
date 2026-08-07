import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  CelebrityRow,
  DbError,
  MessageRow,
  SocialRepository,
  UserLite,
} from './interface';

function toDbError(error: { message: string; code?: string } | null): DbError | null {
  if (!error) return null;
  return { message: error.message, code: error.code };
}

/**
 * sessionClient：用户自己发起的关注/资料修改，尊重RLS。
 * adminClient：搜索用户、私信会话（参与者关系判定存在"先查参与者表才能知道
 * 有没有权限看会话"的循环依赖，session client在这里绕不开）。
 */
export function createSupabaseSocialRepository(
  sessionClient: SupabaseClient,
  adminClient: SupabaseClient
): SocialRepository {
  return {
    async getUserByHandle(handle) {
      const { data } = await sessionClient.from('users').select('id, handle, display_name').eq('handle', handle).single();
      return data as UserLite | null;
    },

    async updateUserProfile(userId, updates) {
      const { error } = await sessionClient.from('users').update(updates).eq('id', userId);
      return { error: toDbError(error) };
    },

    async isHandleTaken(handle, excludeUserId) {
      const { data } = await sessionClient.from('users').select('id').eq('handle', handle).neq('id', excludeUserId).maybeSingle();
      return !!data;
    },

    async searchUsers(query, excludeUserId) {
      let q = adminClient
        .from('users')
        .select('id, handle, display_name')
        .or(`handle.ilike.%${query}%,display_name.ilike.%${query}%`)
        .limit(10);
      if (excludeUserId) q = q.neq('id', excludeUserId);
      const { data } = await q;
      return (data ?? []) as UserLite[];
    },

    async listFollowing(userId) {
      const { data } = await sessionClient
        .from('follows')
        .select('following:users!follows_following_id_fkey(id, handle, display_name)')
        .eq('follower_id', userId);
      return (data ?? []).map((r: any) => r.following).filter(Boolean) as UserLite[];
    },

    async listFollowers(userId) {
      const { data } = await sessionClient
        .from('follows')
        .select('follower:users!follows_follower_id_fkey(id, handle, display_name)')
        .eq('following_id', userId);
      return (data ?? []).map((r: any) => r.follower).filter(Boolean) as UserLite[];
    },

    async listMyFollowingIds(userId, targetIds) {
      if (targetIds.length === 0) return new Set();
      const { data } = await sessionClient
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId)
        .in('following_id', targetIds);
      return new Set((data ?? []).map((f) => f.following_id as string));
    },

    async getFollowEdge(followerId, followingId) {
      const { data } = await sessionClient
        .from('follows')
        .select('follower_id')
        .eq('follower_id', followerId)
        .eq('following_id', followingId)
        .maybeSingle();
      return !!data;
    },

    async follow(followerId, followingId) {
      const { error } = await sessionClient.from('follows').insert({ follower_id: followerId, following_id: followingId });
      return { error: toDbError(error) };
    },

    async unfollow(followerId, followingId) {
      const { error } = await sessionClient
        .from('follows')
        .delete()
        .eq('follower_id', followerId)
        .eq('following_id', followingId);
      return { error: toDbError(error) };
    },

    async listMyParticipations(userId) {
      const { data } = await adminClient.from('conversation_participants').select('conversation_id, last_read_at').eq('user_id', userId);
      return data ?? [];
    },

    async listOtherParticipants(conversationIds, excludeUserId) {
      const map = new Map<string, UserLite>();
      if (conversationIds.length === 0) return map;
      const { data } = await adminClient
        .from('conversation_participants')
        .select('conversation_id, user_id, users(id, display_name, handle)')
        .in('conversation_id', conversationIds)
        .neq('user_id', excludeUserId);
      for (const p of data ?? []) {
        if (!map.has(p.conversation_id)) {
          const u = p.users as any;
          map.set(p.conversation_id, { id: u.id, display_name: u.display_name, handle: u.handle });
        }
      }
      return map;
    },

    async listLastMessages(conversationIds) {
      const map = new Map<string, { content: string; created_at: string }>();
      if (conversationIds.length === 0) return map;
      const { data } = await adminClient
        .from('messages')
        .select('conversation_id, content, created_at')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false });
      for (const msg of data ?? []) {
        if (!map.has(msg.conversation_id)) {
          map.set(msg.conversation_id, { content: msg.content, created_at: msg.created_at });
        }
      }
      return map;
    },

    async findExistingConversationId(myConversationIds, targetUserId) {
      if (myConversationIds.length === 0) return null;
      const { data } = await adminClient
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', targetUserId)
        .in('conversation_id', myConversationIds)
        .maybeSingle();
      return (data?.conversation_id as string | undefined) ?? null;
    },

    async createConversation() {
      const { data, error } = await adminClient.from('conversations').insert({}).select('id').single();
      return { data: data as { id: string } | null, error: toDbError(error) };
    },

    async addParticipants(conversationId, userIds) {
      const { error } = await adminClient
        .from('conversation_participants')
        .insert(userIds.map((userId) => ({ conversation_id: conversationId, user_id: userId })));
      return { error: toDbError(error) };
    },

    async getParticipation(conversationId, userId) {
      const { data } = await adminClient
        .from('conversation_participants')
        .select('conversation_id')
        .eq('conversation_id', conversationId)
        .eq('user_id', userId)
        .maybeSingle();
      return !!data;
    },

    async listMessages(conversationId) {
      const { data } = await adminClient
        .from('messages')
        .select('id, sender_id, content, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      return (data ?? []) as MessageRow[];
    },

    async touchLastRead(conversationId, userId) {
      await adminClient
        .from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', userId);
    },

    async insertMessage(conversationId, senderId, content) {
      const { data, error } = await adminClient
        .from('messages')
        .insert({ conversation_id: conversationId, sender_id: senderId, content })
        .select('id, sender_id, content, created_at')
        .single();
      return { data: data as MessageRow | null, error: toDbError(error) };
    },

    async listCelebrities(stemId) {
      const { data, error } = await sessionClient
        .from('celebrities')
        .select('id, name, portrait_url, display_order')
        .eq('stem_id', stemId)
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (error) return [];
      return (data ?? []) as CelebrityRow[];
    },

    async getStemContent(stemId, locale, contentType) {
      const { data, error } = await sessionClient
        .from('stem_content')
        .select('content')
        .eq('stem_id', stemId)
        .eq('locale', locale)
        .eq('content_type', contentType)
        .eq('is_published', true)
        .single();
      if (error || !data) return null;
      return data.content as Record<string, unknown>;
    },
  };
}
