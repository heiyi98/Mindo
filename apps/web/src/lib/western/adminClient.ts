import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseWesternRepository } from '@mindo/db/supabase';

export function createWesternRepository(sessionClient: SupabaseClient) {
  return createSupabaseWesternRepository(sessionClient);
}
