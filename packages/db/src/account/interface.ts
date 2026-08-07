// 账户/档案模块的数据操作契约（对应 Mindo-认证与账户.md）。
// 登录态判断走 requireApiUser（见 apps/web/src/lib/auth/requireAuth.ts），
// 这里只收口"账户/档案表"本身的读写。

import type { DbError } from '../shared/types';
export type { DbError };

export interface ProfileRow {
  id: string;
  display_name: string;
  birth_date: string;
  birth_time: string | null;
  birth_place_name: string | null;
  birth_lat?: number | null;
  birth_lng?: number | null;
  birth_timezone?: string | null;
  gender?: string | null;
  is_self: boolean;
  order_index?: number | null;
  created_at?: string;
  is_minute_unknown?: boolean;
}

export interface ProfileInsertInput {
  user_id: string;
  display_name: string;
  birth_date: string;
  birth_time: string | null;
  birth_lat: number | null;
  birth_lng: number | null;
  birth_place_name: string | null;
  birth_timezone: string | null;
  is_self: boolean;
  is_minute_unknown: boolean;
  order_index: number;
}

export interface ProfileUpdateInput {
  display_name?: string;
  birth_date?: string;
  birth_time?: string | null;
  birth_lat?: number | null;
  birth_lng?: number | null;
  birth_place_name?: string | null;
  birth_timezone?: string | null;
  gender?: string | null;
  order_index?: number;
  is_minute_unknown?: boolean;
}

export interface BaziAssetRow {
  id: string;
  profile_id: string | null;
  profile_display_name: string | null;
  birth_date: string | null;
  birth_place_name: string | null;
  ai_reading_status: string | null;
  created_at: string;
  calculation_result: unknown;
}

export interface AccountRepository {
  // 档案管理
  listProfiles(userId: string): Promise<ProfileRow[]>;
  // dashboard专用：select('*')，字段比listProfiles更全（含user_id等），
  // 前端仪表盘页面原样把整个profile对象吐给客户端，不能用listProfiles的窄select代替
  getProfileForDashboard(userId: string, profileId: string | null): Promise<Record<string, unknown> | null>;
  createProfile(input: ProfileInsertInput): Promise<{ data: ProfileRow | null; error: DbError | null }>;
  getOwnedProfile(
    profileId: string,
    userId: string
  ): Promise<{ id: string; user_id: string; is_self: boolean } | null>;
  updateProfile(profileId: string, updates: ProfileUpdateInput): Promise<{ error: DbError | null }>;
  deleteProfile(profileId: string): Promise<void>;
  clearProfileSnapshots(profileId: string): Promise<void>;
  getUserVipActive(userId: string): Promise<boolean>;

  // onboarding
  getSelfProfileId(userId: string): Promise<string | null>;
  upsertSelfProfile(
    userId: string,
    displayNameFallback: string,
    input: Omit<ProfileUpdateInput, 'order_index'>
  ): Promise<{ error: DbError | null }>;

  // 仪表盘布局
  getDashboardLayout(profileId: string, userId: string): Promise<unknown | null>;
  updateDashboardLayout(profileId: string, userId: string, layout: unknown): Promise<{ error: DbError | null }>;

  // 账户安全/资产/注销
  getAuthUserHasPassword(userId: string): Promise<boolean>;
  listBaziAssets(userId: string): Promise<BaziAssetRow[]>;
  deleteAllUserData(userId: string): Promise<void>;
  deleteAuthUser(userId: string): Promise<{ error: DbError | null }>;
}
