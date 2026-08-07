import type { DbError } from '../payments/interface';
export type { DbError };

export interface ProfileForWestern {
  birth_date: string;
  birth_time: string | null;
  birth_lat: number | null;
  birth_lng: number | null;
}

export interface WesternSnapshot {
  id: string;
  calculation_result: unknown;
}

export interface WesternRepository {
  getOwnedProfile(profileId: string, userId: string): Promise<ProfileForWestern | null>;
  getSnapshot(profileId: string): Promise<WesternSnapshot | null>;
  insertSnapshot(profileId: string, userId: string, result: unknown): Promise<void>;
  getAiReadingFlag(profileId: string): Promise<{ id: string; ai_reading: string | null } | null>;
}
