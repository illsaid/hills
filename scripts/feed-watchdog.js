#!/usr/bin/env node
/**
 * Feed Staleness Watchdog
 *
 * Queries each data feed's newest row and fails loudly (exit 1) if any feed
 * is older than its threshold. Run daily via .github/workflows/feed-watchdog.yml
 * so a silently dead pipeline produces ONE clear email naming the feed,
 * instead of going unnoticed for months.
 *
 * No dependencies — uses global fetch (Node 18+) against the Supabase REST API.
 */

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!URL_BASE || !KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or key env vars');
  process.exit(1);
}

// name: label shown in output
// table/column: where to look for the newest row
// filter: extra PostgREST filter (optional)
// maxAgeDays: older than this => stale
// Thresholds are deliberately looser than the ingest schedule to avoid
// false alarms from quiet news days / event-driven feeds.
const CHECKS = [
  { name: 'News feed (news-sentinel, hourly)',        table: 'neighborhood_intel', column: 'created_at', filter: 'category=eq.News Feed',          maxAgeDays: 3 },
  { name: 'Safety alerts (lafd-alerts, hourly)',      table: 'neighborhood_intel', column: 'created_at', filter: 'category=eq.Safety',             maxAgeDays: 7 },
  { name: 'Neighborhood sweep (universal-scraper)',   table: 'neighborhood_intel', column: 'created_at', filter: '',                               maxAgeDays: 3 },
  { name: 'Permits (permit-velocity, daily)',         table: 'recent_permits',     column: 'created_at', filter: '',                               maxAgeDays: 14 },
  { name: 'Code enforcement (daily)',                 table: 'code_enforcement',   column: 'created_at', filter: '',                               maxAgeDays: 14 },
  { name: 'Business filings (fbn, daily)',            table: 'raw_fbns',           column: 'filing_date', filter: '',                              maxAgeDays: 21 },
];

async function newest(check) {
  const params = new URLSearchParams();
  params.set('select', check.column);
  params.set('order', `${check.column}.desc.nullslast`);
  params.set('limit', '1');
  const url = `${URL_BASE}/rest/v1/${check.table}?${params}${check.filter ? '&' + check.filter : ''}`;
  const res = await fetch(url, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const rows = await res.json();
  if (!rows.length || !rows[0][check.column]) return null;
  return new Date(rows[0][check.column]);
}

(async () => {
  const stale = [];
  const errors = [];

  for (const check of CHECKS) {
    try {
      const ts = await newest(check);
      if (!ts) {
        stale.push(`${check.name}: table "${check.table}" has no rows`);
        console.log(`❌ ${check.name}: NO DATA`);
        continue;
      }
      const ageDays = (Date.now() - ts.getTime()) / 86400000;
      const ok = ageDays <= check.maxAgeDays;
      console.log(`${ok ? '✅' : '❌'} ${check.name}: newest row ${ts.toISOString().slice(0, 16)} (${ageDays.toFixed(1)}d old, limit ${check.maxAgeDays}d)`);
      if (!ok) stale.push(`${check.name}: ${ageDays.toFixed(1)} days old (limit ${check.maxAgeDays})`);
    } catch (err) {
      console.log(`⚠️ ${check.name}: check failed — ${err.message}`);
      errors.push(`${check.name}: ${err.message}`);
    }
  }

  if (stale.length || errors.length) {
    console.error('\n=== WATCHDOG: PROBLEMS DETECTED ===');
    stale.forEach(s => console.error('STALE: ' + s));
    errors.forEach(e => console.error('CHECK ERROR: ' + e));
    process.exit(1);
  }
  console.log('\nAll feeds fresh.');
})();
