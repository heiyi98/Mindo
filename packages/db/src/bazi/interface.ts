import type { DbError } from '../shared/types';
export type { DbError };

export interface BaziSnapshotForReading {
  id: string;
  calculation_result: unknown;
  user_id: string;
  profile_id: string | null;
}

export interface ProfileBirthInfo {
  display_name: string | null;
  birth_date: string | null;
  birth_time: string | null;
  birth_lat: number | null;
  birth_lng: number | null;
  birth_place_name: string | null;
  gender: string | null;
}

export interface CreateReadingInput {
  id: string;
  userId: string;
  profileId: string | null;
  profileDisplayName: string | null;
  birthDate: string | null;
  birthTime: string | null;
  birthLat: number | null;
  birthLng: number | null;
  birthPlaceName: string | null;
  birthGender: string | null;
  calculationResult: unknown;
  locale: string;
  chargeType: 'wallet' | 'voucher';
  chargeWalletAmount: number;
  chargeVoucherId: string | null;
}

export interface StuckReadingRow {
  id: string;
  user_id: string;
  calculation_result: unknown;
  locale: string;
  ai_reading_status: string;
  retry_count: number;
  content_policy_retry_count: number;
  first_attempt_at: string;
  last_attempt_at: string;
  alert_status: string | null;
  charge_type: 'wallet' | 'voucher' | null;
  charge_wallet_amount: number;
  charge_voucher_id: string | null;
  charge_refunded_at: string | null;
}

export interface SnapshotForDashboard {
  id: string;
  calculation_result: unknown;
}

export interface LifeTimelineRow {
  baseline_imbalance: number;
  baseline_energies: unknown;
  years: unknown[];
}

export interface LatestReadingSummary {
  id: string;
  ai_reading_theme1: unknown;
  ai_reading_status: string | null;
}

export interface SystemAlertRow {
  id: string;
  reading_id: string | null;
  alert_type: string;
  message: string | null;
  created_at: string;
}

export interface ReadingDiagnostics {
  id: string;
  user_id: string;
  profile_id: string | null;
  ai_reading_status: string | null;
  retry_count: number;
  content_policy_retry_count: number;
  first_attempt_at: string;
  last_attempt_at: string;
  alert_status: string | null;
  charge_type: 'wallet' | 'voucher' | null;
  charge_wallet_amount: number;
  charge_voucher_id: string | null;
  charge_refunded_at: string | null;
  deleted_at: string | null;
  created_at: string;
}

/**
 * 八字报告生成链路的数据操作契约。扣款/退款/凭证核销不在这里重复定义——
 * 直接复用 PaymentsRepository（见 @mindo/db 的 payments 部分）和
 * @mindo/payments 里的 deductWallet/refundWallet/consumeVoucher，这里
 * 只收口 bazi_snapshots/bazi_readings/life_timeline 这几张表本身的读写。
 */
export interface BaziRepository {
  getOwnedSnapshot(snapshotId: string, userId: string): Promise<BaziSnapshotForReading | null>;
  getProfileBirthInfo(profileId: string): Promise<ProfileBirthInfo | null>;
  createReading(input: CreateReadingInput): Promise<{ data: { id: string } | null; error: DbError | null }>;
  // staleBeforeIso：last_attempt_at早于这个时间点，才算"卡住"，避免正在处理中的记录被重复触发
  getStuckReadings(staleBeforeIso: string): Promise<StuckReadingRow[]>;
  // 退款+终态失败+自动软删除一次性完成，让档案立即恢复成可重新生成的状态
  markReadingFailedPermanent(readingId: string): Promise<void>;
  // 清空alert_status（重新触发前）+ 把该reading关联的未处理system_alerts一并标记resolved
  clearAlertStatus(readingId: string): Promise<void>;
  // 用户手动删除报告：软删除，仅限本人。返回null代表这条记录不存在或不属于该用户
  deleteReading(readingId: string, userId: string): Promise<{ id: string } | null>;

  // dashboard/fortune-daily/assessments-status 共用
  getSnapshotForDashboard(profileId: string): Promise<SnapshotForDashboard | null>;
  updateSnapshotResult(snapshotId: string, result: unknown): Promise<void>;
  deleteSnapshotsForProfile(profileId: string): Promise<void>;
  insertSnapshotForProfile(profileId: string, userId: string, result: unknown): Promise<void>;
  hasSnapshot(profileId: string): Promise<boolean>;
  getLifeTimeline(profileId: string): Promise<LifeTimelineRow | null>;
  insertLifeTimeline(input: {
    profileId: string; userId: string; baselineImbalance: number; baselineEnergies: unknown; years: unknown;
  }): Promise<void>;
  getLatestReadingSummary(profileId: string): Promise<LatestReadingSummary | null>;

  // /admin/alerts 后台警报列表
  listUnresolvedAlerts(): Promise<SystemAlertRow[]>;
  resolveAlert(alertId: string): Promise<void>;
  getReadingDiagnostics(readingId: string): Promise<ReadingDiagnostics | null>;
}
