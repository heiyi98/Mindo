import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AccountRepository,
  BaziAssetRow,
  DbError,
  ProfileInsertInput,
  ProfileRow,
  ProfileUpdateInput,
} from './interface';

function toDbError(error: { message: string; code?: string } | null): DbError | null {
  if (!error) return null;
  return { message: error.message, code: error.code };
}

/**
 * sessionClient：尊重RLS的session client，档案/资产这类"本来就该只查自己"
 * 的操作用它。adminClient：service role，只用于 Auth Admin API（删除
 * auth.users行、查是否设置过密码）——这两件事session client无论如何做不到，
 * 不是本项目"支付/账本表用service role"那条规矩的延伸，是Supabase Auth
 * Admin API本身的硬性要求。
 */
export function createSupabaseAccountRepository(
  sessionClient: SupabaseClient,
  adminClient: SupabaseClient
): AccountRepository {
  return {
    async listProfiles(userId) {
      const { data } = await sessionClient
        .from('profiles')
        .select('id, display_name, birth_date, birth_time, birth_place_name, birth_lat, birth_lng, birth_timezone, gender, is_self, created_at, order_index, is_minute_unknown')
        .eq('user_id', userId)
        .order('is_self', { ascending: false })
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: true });
      return (data ?? []) as ProfileRow[];
    },

    async getProfileForDashboard(userId, profileId) {
      let query = sessionClient.from('profiles').select('*').eq('user_id', userId);
      query = profileId ? query.eq('id', profileId) : query.eq('is_self', true);
      const { data } = await query.order('created_at', { ascending: true }).limit(1);
      return (data?.[0] as Record<string, unknown> | undefined) ?? null;
    },

    async createProfile(input: ProfileInsertInput) {
      const { data, error } = await sessionClient
        .from('profiles')
        .insert(input)
        .select()
        .single();
      return { data: data as ProfileRow | null, error: toDbError(error) };
    },

    async getOwnedProfile(profileId, userId) {
      const { data } = await sessionClient
        .from('profiles')
        .select('id, user_id, is_self')
        .eq('id', profileId)
        .eq('user_id', userId)
        .maybeSingle();
      return data as { id: string; user_id: string; is_self: boolean } | null;
    },

    async updateProfile(profileId, updates: ProfileUpdateInput) {
      const { error } = await sessionClient.from('profiles').update(updates).eq('id', profileId);
      return { error: toDbError(error) };
    },

    async deleteProfile(profileId) {
      await sessionClient.from('profiles').delete().eq('id', profileId);
    },

    async clearProfileSnapshots(profileId) {
      await Promise.all([
        sessionClient.from('bazi_snapshots').delete().eq('profile_id', profileId),
        sessionClient.from('astrology_snapshots').delete().eq('profile_id', profileId),
        sessionClient.from('life_timeline').delete().eq('profile_id', profileId),
      ]);
    },

    async getUserVipActive(userId) {
      const { data } = await sessionClient
        .from('users')
        .select('vip_expires_at')
        .eq('id', userId)
        .single();
      const expiresAt = data?.vip_expires_at as string | null | undefined;
      return !!expiresAt && new Date(expiresAt).getTime() > Date.now();
    },

    async getSelfProfileId(userId) {
      const { data } = await sessionClient
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .eq('is_self', true)
        .maybeSingle();
      return (data?.id as string | undefined) ?? null;
    },

    async upsertSelfProfile(userId, displayNameFallback, input) {
      const { data: existing } = await sessionClient
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .eq('is_self', true)
        .maybeSingle();
      const existingId = (existing?.id as string | undefined) ?? null;

      const profileData = {
        user_id: userId,
        display_name: displayNameFallback,
        is_self: true,
        ...input,
      };

      const { error } = existingId
        ? await sessionClient.from('profiles').update(profileData).eq('id', existingId)
        : await sessionClient.from('profiles').insert(profileData);

      return { error: toDbError(error) };
    },

    async getDashboardLayout(profileId, userId) {
      const { data } = await sessionClient
        .from('profiles')
        .select('dashboard_layout')
        .eq('id', profileId)
        .eq('user_id', userId)
        .maybeSingle();
      return (data as { dashboard_layout: unknown } | null)?.dashboard_layout ?? null;
    },

    async updateDashboardLayout(profileId, userId, layout) {
      const { error } = await sessionClient
        .from('profiles')
        .update({ dashboard_layout: layout })
        .eq('id', profileId)
        .eq('user_id', userId);
      return { error: toDbError(error) };
    },

    async getAuthUserHasPassword(userId) {
      const { data } = await adminClient.auth.admin.getUserById(userId);
      return !!(data?.user as { encrypted_password?: string } | undefined)?.encrypted_password;
    },

    async listBaziAssets(userId) {
      const { data } = await sessionClient
        .from('bazi_readings')
        .select('id, profile_id, profile_display_name, birth_date, birth_place_name, ai_reading_status, created_at, calculation_result')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      return (data ?? []) as BaziAssetRow[];
    },

    async deleteAllUserData(userId) {
      await sessionClient.from('bazi_snapshots').delete().eq('user_id', userId);
      await sessionClient.from('astrology_snapshots').delete().eq('user_id', userId);
      await sessionClient.from('bigfive_assessments').delete().eq('user_id', userId);
      await sessionClient.from('profiles').delete().eq('user_id', userId);
      await sessionClient.from('subscriptions').delete().eq('user_id', userId);
      await sessionClient.from('purchases').delete().eq('user_id', userId);
      await sessionClient.from('users').delete().eq('id', userId);
    },

    async deleteAuthUser(userId) {
      const { error } = await adminClient.auth.admin.deleteUser(userId);
      return { error: toDbError(error) };
    },
  };
}
