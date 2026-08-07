import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  BigfiveAssessmentInsert,
  BigfiveAssessmentRow,
  BigfiveAssessmentSource,
  BigfiveRepository,
  DbError,
  NormParams,
  NormRow,
  ProfileForBigfive,
} from './interface';

function toDbError(error: { message: string; code?: string } | null): DbError | null {
  if (!error) return null;
  return { message: error.message, code: error.code };
}

function applyNullableFilter(query: any, column: string, value: string | null) {
  return value === null ? query.is(column, null) : query.eq(column, value);
}

/**
 * sessionClient：本人档案/本人测算记录的读写，尊重RLS。
 * adminClient：导入他人测算结果时，源记录属于"任何人"，必须绕过RLS才能读到，
 * 以及清理某个档案下的旧记录时同理。
 */
export function createSupabaseBigfiveRepository(
  sessionClient: SupabaseClient,
  adminClient: SupabaseClient
): BigfiveRepository {
  return {
    async getOwnedProfileForAssessment(profileId, userId) {
      const { data } = await sessionClient
        .from('profiles')
        .select('id, birth_date, gender')
        .eq('id', profileId)
        .eq('user_id', userId)
        .single();
      return data as ProfileForBigfive | null;
    },

    async insertAssessment(input: BigfiveAssessmentInsert) {
      const { data, error } = await sessionClient
        .from('bigfive_assessments')
        .insert(input)
        .select('id')
        .single();
      return { data: data as { id: string } | null, error: toDbError(error) };
    },

    async deleteOldAssessments(profileId, keepId) {
      const { error } = await adminClient
        .from('bigfive_assessments')
        .delete()
        .eq('profile_id', profileId)
        .neq('id', keepId);
      if (error) console.error('[bigfive] delete old assessments error:', error);
    },

    async getOwnedAssessment(profileId, userId) {
      const { data } = await sessionClient
        .from('bigfive_assessments')
        .select('*')
        .eq('profile_id', profileId)
        .eq('user_id', userId)
        .maybeSingle();
      return data as BigfiveAssessmentRow | null;
    },

    async getAssessmentIdForProfile(profileId) {
      const { data } = await sessionClient
        .from('bigfive_assessments')
        .select('id')
        .eq('profile_id', profileId)
        .maybeSingle();
      return (data?.id as string | undefined) ?? null;
    },

    async deleteAssessment(profileId, userId) {
      await sessionClient
        .from('bigfive_assessments')
        .delete()
        .eq('profile_id', profileId)
        .eq('user_id', userId);
    },

    async matchNorm(params: NormParams) {
      const { region_country: country, region_level1: level1, region_level2: level2, region_level3: level3, gender, age_group } = params;

      const candidates = [
        { rc: country, rl1: level1, rl2: level2, rl3: level3, g: gender, ag: age_group },
        { rc: country, rl1: level1, rl2: level2, rl3: level3, g: gender, ag: null },
        { rc: country, rl1: level1, rl2: level2, rl3: level3, g: null,   ag: null },
        { rc: country, rl1: level1, rl2: level2, rl3: null,   g: gender, ag: age_group },
        { rc: country, rl1: level1, rl2: level2, rl3: null,   g: gender, ag: null },
        { rc: country, rl1: level1, rl2: level2, rl3: null,   g: null,   ag: null },
        { rc: country, rl1: level1, rl2: null,   rl3: null,   g: gender, ag: age_group },
        { rc: country, rl1: level1, rl2: null,   rl3: null,   g: gender, ag: null },
        { rc: country, rl1: level1, rl2: null,   rl3: null,   g: null,   ag: null },
        { rc: country, rl1: null,   rl2: null,   rl3: null,   g: gender, ag: age_group },
        { rc: country, rl1: null,   rl2: null,   rl3: null,   g: gender, ag: null },
        { rc: country, rl1: null,   rl2: null,   rl3: null,   g: null,   ag: null },
        { rc: null,    rl1: null,   rl2: null,   rl3: null,   g: gender, ag: age_group },
        { rc: null,    rl1: null,   rl2: null,   rl3: null,   g: gender, ag: null },
        { rc: null,    rl1: null,   rl2: null,   rl3: null,   g: null,   ag: null },
      ];

      for (const c of candidates) {
        let query = sessionClient.from('bigfive_norms').select('*');
        query = applyNullableFilter(query, 'region_country', c.rc);
        query = applyNullableFilter(query, 'region_level1', c.rl1);
        query = applyNullableFilter(query, 'region_level2', c.rl2);
        query = applyNullableFilter(query, 'region_level3', c.rl3);
        query = applyNullableFilter(query, 'gender', c.g);
        query = applyNullableFilter(query, 'age_group', c.ag);
        const { data } = await query.maybeSingle();
        if (data && (data as NormRow).sample_size > 0) return data as NormRow;
      }

      return null;
    },

    async getAssessmentSourceById(assessmentId) {
      const { data } = await adminClient
        .from('bigfive_assessments')
        .select('domain_scores, facet_scores, region_country, region_level1, region_level2, region_level3, region_display_name, age_group, gender')
        .eq('id', assessmentId)
        .single();
      return data as BigfiveAssessmentSource | null;
    },

    async getSelfProfileDisplayName(userId) {
      const { data } = await sessionClient
        .from('profiles')
        .select('display_name')
        .eq('user_id', userId)
        .eq('is_self', true)
        .single();
      return (data?.display_name as string | undefined) ?? null;
    },

    async getUserHandleAndName(userId) {
      const { data } = await sessionClient
        .from('users')
        .select('handle, display_name')
        .eq('id', userId)
        .single();
      return data as { handle: string | null; display_name: string | null } | null;
    },

    async getProfileDisplayName(profileId) {
      const { data } = await sessionClient
        .from('profiles')
        .select('display_name')
        .eq('id', profileId)
        .single();
      return (data?.display_name as string | undefined) ?? null;
    },
  };
}
