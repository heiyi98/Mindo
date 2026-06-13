// Checks Supabase for existing bigfive snapshots using service role key.
// Also performs a test insert via the API to verify the write path end-to-end.
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wsbskrgrkajnzzgpcfws.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY env var required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── 1. Check existing bigfive snapshots ───────────────────────────────────────
const { data: snapshots, error: fetchErr } = await supabase
  .from('snapshots')
  .select('id, profile_id, snapshot_type, created_at')
  .eq('snapshot_type', 'bigfive')
  .order('created_at', { ascending: false })
  .limit(10);

if (fetchErr) {
  console.error('Fetch error:', fetchErr.message);
} else {
  console.log(`\n── bigfive snapshots in DB (${snapshots.length} found) ──`);
  if (snapshots.length === 0) {
    console.log('  (none) — no bigfive snapshot has ever been written.');
  } else {
    for (const s of snapshots) {
      console.log(`  id=${s.id}  profile=${s.profile_id}  created=${s.created_at}`);
    }
  }
}

// ── 2. List all profiles so we have a valid profile_id for a test insert ──────
const { data: profiles, error: profileErr } = await supabase
  .from('profiles')
  .select('id, user_id, display_name')
  .limit(5);

if (profileErr) {
  console.error('Profile fetch error:', profileErr.message);
  process.exit(1);
}
console.log(`\n── profiles available (${profiles.length}) ──`);
for (const p of profiles) {
  console.log(`  id=${p.id}  user=${p.user_id}  name=${p.display_name}`);
}

if (profiles.length === 0) {
  console.log('No profiles found — cannot perform test insert.');
  process.exit(0);
}

// ── 3. Test insert (only if no bigfive snapshot exists for first profile) ─────
const testProfile = profiles[0];
const existing = snapshots?.find(s => s.profile_id === testProfile.id);
if (existing) {
  console.log(`\nProfile ${testProfile.id} already has a bigfive snapshot — skipping test insert.`);
  process.exit(0);
}

console.log(`\n── Test insert for profile ${testProfile.id} (${testProfile.display_name}) ──`);
const fakeResult = {
  O: { score: 60, facets: {} },
  C: { score: 70, facets: {} },
  E: { score: 50, facets: {} },
  A: { score: 65, facets: {} },
  N: { score: 40, facets: {} },
};
const { error: insertErr } = await supabase.from('snapshots').insert({
  profile_id: testProfile.id,
  user_id: testProfile.user_id,
  snapshot_type: 'bigfive',
  input_hash: `bigfive_${testProfile.id}`,
  calculation_result: fakeResult,
});

if (insertErr) {
  console.error('INSERT FAILED:', insertErr.message, insertErr.details ?? '');
} else {
  console.log('INSERT SUCCESS ✓');
  // Verify by reading it back
  const { data: readBack } = await supabase
    .from('snapshots')
    .select('id, snapshot_type, created_at')
    .eq('profile_id', testProfile.id)
    .eq('snapshot_type', 'bigfive')
    .single();
  console.log('Read back:', readBack);
}
