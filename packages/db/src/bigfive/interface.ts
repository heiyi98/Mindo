import type { DbError } from '../payments/interface';
export type { DbError };

export interface ProfileForBigfive {
  id: string;
  birth_date: string | null;
  gender: string | null;
}

export interface BigfiveAssessmentInsert {
  profile_id: string;
  user_id: string;
  domain_scores: Record<string, number>;
  facet_scores: Record<string, number>;
  region_country: string | null;
  region_level1: string | null;
  region_level2: string | null;
  region_level3: string | null;
  region_display_name: string | null;
  age_group: string | null;
  gender: string | null;
  // 只有"导入他人测算结果"这条路径会填这三个（冗余快照，方便管理/审计时
  // 一眼看出这条记录导入自谁），直接提交自己作答的路径不传
  profile_display_name?: string | null;
  user_display_name?: string | null;
  user_handle?: string | null;
}

export interface BigfiveAssessmentRow {
  id: string;
  domain_scores: Record<string, number>;
  facet_scores: Record<string, number>;
  region_country: string | null;
  region_level1: string | null;
  region_level2: string | null;
  region_level3: string | null;
  region_display_name: string | null;
  age_group: string | null;
  gender: string | null;
  submitted_at: string;
}

export interface BigfiveAssessmentSource {
  domain_scores: Record<string, number>;
  facet_scores: Record<string, number>;
  region_country: string | null;
  region_level1: string | null;
  region_level2: string | null;
  region_level3: string | null;
  region_display_name: string | null;
  age_group: string | null;
  gender: string | null;
}

export interface NormRow {
  statistics: Record<string, unknown>;
  sample_size: number;
}

export interface NormParams {
  region_country: string | null;
  region_level1: string | null;
  region_level2: string | null;
  region_level3: string | null;
  gender: string | null;
  age_group: string | null;
}

export interface BigfiveRepository {
  getOwnedProfileForAssessment(profileId: string, userId: string): Promise<ProfileForBigfive | null>;
  insertAssessment(input: BigfiveAssessmentInsert): Promise<{ data: { id: string } | null; error: DbError | null }>;
  deleteOldAssessments(profileId: string, keepId: string): Promise<void>;
  getOwnedAssessment(profileId: string, userId: string): Promise<BigfiveAssessmentRow | null>;
  getAssessmentIdForProfile(profileId: string): Promise<string | null>;
  deleteAssessment(profileId: string, userId: string): Promise<void>;
  matchNorm(params: NormParams): Promise<NormRow | null>;

  // 导入他人测算结果专用
  getAssessmentSourceById(assessmentId: string): Promise<BigfiveAssessmentSource | null>;
  getSelfProfileDisplayName(userId: string): Promise<string | null>;
  getUserHandleAndName(userId: string): Promise<{ handle: string | null; display_name: string | null } | null>;
  getProfileDisplayName(profileId: string): Promise<string | null>;
}
