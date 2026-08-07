import { createClient as createAdminClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseBigfiveRepository } from '@mindo/db/supabase';

const bigfiveAdminClient = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export function createBigfiveRepository(sessionClient: SupabaseClient) {
  return createSupabaseBigfiveRepository(sessionClient, bigfiveAdminClient);
}
