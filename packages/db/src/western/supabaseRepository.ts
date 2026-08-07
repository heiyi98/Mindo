import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProfileForWestern, WesternRepository, WesternSnapshot } from './interface';

export function createSupabaseWesternRepository(sessionClient: SupabaseClient): WesternRepository {
  return {
    async getOwnedProfile(profileId, userId) {
      const { data } = await sessionClient
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .eq('user_id', userId)
        .single();
      return data as ProfileForWestern | null;
    },

    async getSnapshot(profileId) {
      const { data } = await sessionClient
        .from('astrology_snapshots')
        .select('id, calculation_result')
        .eq('profile_id', profileId)
        .maybeSingle();
      return data as WesternSnapshot | null;
    },

    async insertSnapshot(profileId, userId, result) {
      await sessionClient.from('astrology_snapshots').insert({
        profile_id: profileId,
        user_id: userId,
        calculation_result: result,
      });
    },

    async getAiReadingFlag(profileId) {
      const { data } = await sessionClient
        .from('astrology_snapshots')
        .select('id, ai_reading')
        .eq('profile_id', profileId)
        .maybeSingle();
      return data as { id: string; ai_reading: string | null } | null;
    },
  };
}
