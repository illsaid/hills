#!/usr/bin/env node
/**
 * Google News RSS Feed
 *
 * The simple approach that worked: query Google News RSS for Hills-area
 * keywords. But unlike the old news-feed.py (which wrote to a JSON file
 * nothing read), this writes to neighborhood_intel with category
 * 'News Feed' — the table /api/news-feed actually serves the sidebar from.
 *
 * No API key required. Runs hourly via realtime-alerts.yml.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

const KEYWORDS = [
  'Hollywood Hills', 'Laurel Canyon', 'Runyon Canyon', 'Mulholland',
  'Beachwood Canyon', 'Nichols Canyon', 'Bird Streets',
  'Sunset Strip', 'Hollywood Blvd', 'Franklin Ave',
  '90046', '90068', '90069',
  'Griffith Park', 'Hollywood Bowl',
  'Cahuenga Pass', 'Hollywood Reservoir', 'Lake Hollywood',
  'Hollywood sign', 'Sunset Plaza',
  'Outpost Drive', 'Wonderland Avenue',
];

const BLOCKED_DOMAINS = ['msn.com', 'yahoo.com', 'aol.com', 'marketwatch.com', 'businessinsider.com'];

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n));
}

function stripHtml(s) {
  return decodeEntities(String(s).replace(/<[^>]*>/g, '')).trim();
}

function tag(block, name) {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? m[1].trim() : '';
}

function parseRss(xml) {
  const items = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const block = m[1];
    let title = tag(block, 'title');
    title = stripHtml(title.replace(/^<!\[CDATA\[|\]\]>$/g, ''));
    const link = stripHtml(tag(block, 'link'));
    const pubDate = tag(block, 'pubDate');
    const source = stripHtml(tag(block, 'source')) || 'Google News';
    const description = stripHtml(tag(block, 'description')).slice(0, 500);
    if (title && link) items.push({ title, link, pubDate, source, description });
  }
  return items;
}

(async () => {
  // Google News RSS: OR-joined quoted keywords, last 7 days
  const query = '(' + KEYWORDS.map(k => `"${k}"`).join(' OR ') + ') when:7d';
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
  console.log('Fetching Google News RSS...');

  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (HillsLedger/1.0)' } });
  if (!res.ok) {
    console.error(`❌ RSS fetch failed: HTTP ${res.status}`);
    process.exit(1);
  }
  const xml = await res.text();
  const items = parseRss(xml);
  console.log(`Parsed ${items.length} items`);

  // Filter + dedupe by normalized title (Google News often repeats syndicated stories)
  const seen = new Set();
  const rows = [];
  for (const it of items) {
    if (BLOCKED_DOMAINS.some(d => it.link.includes(d) || it.source.toLowerCase().includes(d.split('.')[0]))) continue;
    const norm = it.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 60);
    if (seen.has(norm)) continue;
    seen.add(norm);
    const published = it.pubDate ? new Date(it.pubDate) : null;
    rows.push({
      source_name: it.source,
      title: it.title.slice(0, 300),
      description: it.description || null,
      url: it.link,
      category: 'News Feed',
      published_at: published && !isNaN(published) ? published.toISOString() : null,
    });
  }
  console.log(`${rows.length} items after filtering/dedupe`);
  if (!rows.length) { console.log('Nothing to insert.'); return; }

  // Upsert on the url UNIQUE constraint; ignore rows we already have
  const { error, count } = await supabase
    .from('neighborhood_intel')
    .upsert(rows, { onConflict: 'url', ignoreDuplicates: true, count: 'exact' });

  if (error) {
    console.error('❌ Insert failed:', error.message);
    process.exit(1);
  }
  console.log(`✅ Upserted (${count ?? rows.length} rows touched)`);
})().catch(err => { console.error('❌', err.message); process.exit(1); });
