import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  'https://wsbskrgrkajnzzgpcfws.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
const { error } = await supabase
  .from('snapshots')
  .delete()
  .eq('id', '0cc61f7a-2af1-4339-af2f-db02e3b1c133');
console.log(error ? 'DELETE error: ' + error.message : 'Test snapshot deleted ✓');
