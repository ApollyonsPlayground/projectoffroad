// Run the social tables migration against the live Supabase project.
// Usage: node --env-file-if-exists=/vercel/share/.env.project scripts/run_migration.js

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('[migration] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('[migration] Add SUPABASE_SERVICE_ROLE_KEY to your project env vars to run migrations.');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

const sql = readFileSync(join(__dirname, '001_setup_social_tables.sql'), 'utf8');

// Split on statement boundaries and run each one
const statements = sql
  .split(/;(\s*\n)/)
  .map((s) => s.trim())
  .filter((s) => s.length > 0 && !s.startsWith('--'));

console.log(`[migration] Running ${statements.length} SQL statements...`);

for (let i = 0; i < statements.length; i++) {
  const stmt = statements[i];
  if (!stmt) continue;
  const { error } = await supabase.rpc('exec_sql', { sql: stmt }).then(
    // supabase-js doesn't have raw SQL — use the REST API directly
    async () => {
      const res = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql: stmt + ';' }),
      });
      if (!res.ok) {
        const text = await res.text();
        return { error: text };
      }
      return { error: null };
    }
  );
  if (error) {
    console.warn(`[migration] Statement ${i + 1} warning: ${typeof error === 'string' ? error.slice(0, 120) : JSON.stringify(error)}`);
  } else {
    process.stdout.write('.');
  }
}

console.log('\n[migration] Done. Run this script after adding SUPABASE_SERVICE_ROLE_KEY.');
