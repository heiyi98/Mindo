import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  BaziRepository,
  BaziSnapshotForReading,
  CreateReadingInput,
  DbError,
  LatestReadingSummary,
  LifeTimelineRow,
  ProfileBirthInfo,
  SnapshotForDashboard,
  StuckReadingRow,
} from './interface';

function toDbError(error: { message: string; code?: string } | null): DbError | null {
  if (!error) return null;
  return { message: error.message, code: error.code };
}

/**
 * sessionClient：读快照/档案这类"只读自己的"操作用它，尊重RLS。
 * adminClient：bazi_readings 的写入必须用service role——这张表历史上对
 * owner开了INSERT策略，留着不收紧的话，任何登录用户能在浏览器控制台直接
 * insert一行'generating'状态的记录，绕过扣款逻辑等 reading-recovery 这个
 * cron五分钟后捡到就白嫖一次生成（详见 Mindo-支付系统.md）。
 * cron场景没有真实session，调用方直接把同一个admin client当sessionClient
 * 传进来即可。
 */
export function createSupabaseBaziRepository(
  sessionClient: SupabaseClient,
  adminClient: SupabaseClient
): BaziRepository {
  return {
    async getOwnedSnapshot(snapshotId, userId) {
      const { data } = await sessionClient
        .from('bazi_snapshots')
        .select('id, calculation_result, user_id, profile_id')
        .eq('id', snapshotId)
        .eq('user_id', userId)
        .single();
      return data as BaziSnapshotForReading | null;
    },

    async getProfileBirthInfo(profileId) {
      const { data } = await sessionClient
        .from('profiles')
        .select('display_name, birth_date, birth_time, birth_lat, birth_lng, birth_place_name, gender')
        .eq('id', profileId)
        .single();
      return data as ProfileBirthInfo | null;
    },

    async createReading(input: CreateReadingInput) {
      const { data, error } = await adminClient
        .from('bazi_readings')
        .insert({
          id: input.id,
          user_id: input.userId,
          profile_id: input.profileId,
          profile_display_name: input.profileDisplayName,
          birth_date: input.birthDate,
          birth_time: input.birthTime,
          birth_lat: input.birthLat,
          birth_lng: input.birthLng,
          birth_place_name: input.birthPlaceName,
          birth_gender: input.birthGender,
          calculation_result: input.calculationResult,
          locale: input.locale,
          ai_reading_status: 'generating',
          charge_type: input.chargeType,
          charge_wallet_amount: input.chargeWalletAmount,
          charge_voucher_id: input.chargeVoucherId,
        })
        .select('id')
        .single();
      return { data: data as { id: string } | null, error: toDbError(error) };
    },

    async getStuckReadings(staleBeforeIso) {
      const { data } = await adminClient
        .from('bazi_readings')
        .select(
          'id, user_id, calculation_result, locale, ai_reading_status, retry_count, content_policy_retry_count, first_attempt_at, last_attempt_at, alert_status, charge_type, charge_wallet_amount, charge_voucher_id, charge_refunded_at'
        )
        .is('deleted_at', null)
        .not('ai_reading_status', 'is', null)
        .neq('ai_reading_status', 'done')
        .not('ai_reading_status', 'like', 'failed%')
        .lt('last_attempt_at', staleBeforeIso)
        .limit(10);
      return (data ?? []) as StuckReadingRow[];
    },

    async markReadingFailedPermanent(readingId) {
      const nowIso = new Date().toISOString();
      await adminClient
        .from('bazi_readings')
        .update({ ai_reading_status: 'failed_permanent', charge_refunded_at: nowIso, deleted_at: nowIso })
        .eq('id', readingId);
    },

    async clearAlertStatus(readingId) {
      await adminClient.from('bazi_readings').update({ alert_status: null }).eq('id', readingId);
      await adminClient
        .from('system_alerts')
        .update({ resolved_at: new Date().toISOString() })
        .eq('reading_id', readingId)
        .is('resolved_at', null);
    },

    async deleteReading(readingId, userId) {
      await adminClient
        .from('bazi_readings')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', readingId)
        .eq('user_id', userId);
    },

    async getSnapshotForDashboard(profileId) {
      const { data } = await sessionClient
        .from('bazi_snapshots')
        .select('id, calculation_result')
        .eq('profile_id', profileId)
        .maybeSingle();
      return data as SnapshotForDashboard | null;
    },

    async updateSnapshotResult(snapshotId, result) {
      await sessionClient.from('bazi_snapshots').update({ calculation_result: result }).eq('id', snapshotId);
    },

    async deleteSnapshotsForProfile(profileId) {
      await sessionClient.from('bazi_snapshots').delete().eq('profile_id', profileId);
    },

    async insertSnapshotForProfile(profileId, userId, result) {
      await sessionClient.from('bazi_snapshots').insert({
        profile_id: profileId,
        user_id: userId,
        calculation_result: result,
      });
    },

    async hasSnapshot(profileId) {
      const { data } = await sessionClient
        .from('bazi_snapshots')
        .select('id')
        .eq('profile_id', profileId)
        .maybeSingle();
      return !!data;
    },

    async getLifeTimeline(profileId) {
      const { data } = await sessionClient
        .from('life_timeline')
        .select('baseline_imbalance, baseline_energies, years')
        .eq('profile_id', profileId)
        .single();
      return data as LifeTimelineRow | null;
    },

    async insertLifeTimeline(input) {
      await sessionClient.from('life_timeline').insert({
        profile_id: input.profileId,
        user_id: input.userId,
        baseline_imbalance: input.baselineImbalance,
        baseline_energies: input.baselineEnergies,
        years: input.years,
      });
    },

    async getLatestReadingSummary(profileId) {
      const { data } = await sessionClient
        .from('bazi_readings')
        .select('id, ai_reading_theme1, ai_reading_status')
        .eq('profile_id', profileId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as LatestReadingSummary | null;
    },
  };
}
