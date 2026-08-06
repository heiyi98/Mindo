import { createClient as createAdminClient } from '@supabase/supabase-js';

export const paymentsAdminClient = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
