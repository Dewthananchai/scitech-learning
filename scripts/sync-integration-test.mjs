/* One-shot integration test of the app's cloud-sync operations
   against the user's Supabase project — mirrors src/lib/cloudSync.ts */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  // Node 20 lacks native WebSocket (browser unaffected) — realtime unused by the app
  realtime: { transport: class { constructor() {} close() {} } },
});

// 1) upsert — the exact call flush() makes
const payload = [{
  id: 'scitech_announcements',
  value: JSON.stringify([{ id: 1, title: 'sync-test', created_at: new Date().toISOString() }]),
  updated_at: new Date().toISOString(),
}];
const { error: upErr } = await supabase.from('app_state').upsert(payload, { onConflict: 'id' });
console.log('upsert:', upErr ? 'FAIL ' + upErr.message : 'OK');

// 2) select — the exact call hydrateFromCloud() makes
const { data, error: selErr } = await supabase
  .from('app_state')
  .select('id, value, updated_at')
  .in('id', ['scitech_announcements', 'onet_bank_data_v1']);
console.log('select:', selErr ? 'FAIL ' + selErr.message : `OK (${data.length} rows)`);
const row = data?.find(r => r.id === 'scitech_announcements');
const parsed = row ? JSON.parse(typeof row.value === 'string' ? row.value : '[]') : [];
console.log('roundtrip value matches:', JSON.stringify(parsed[0]?.title) === '"sync-test"' || parsed[0]?.title === 'sync-test');
console.log('updated_at preserved:', row?.updated_at);

// 3) cleanup
const { error: delErr } = await supabase.from('app_state').delete().eq('id', 'scitech_announcements');
console.log('cleanup delete:', delErr ? 'FAIL ' + delErr.message : 'OK');
