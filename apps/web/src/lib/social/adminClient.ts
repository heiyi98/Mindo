import { createClient as createAdminClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseSocialRepository } from '@mindo/db/supabase';

const socialAdminClient = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export function createSocialRepository(sessionClient: SupabaseClient) {
  return createSupabaseSocialRepository(sessionClient, socialAdminClient);
}
