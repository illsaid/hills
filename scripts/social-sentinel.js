#!/usr/bin/env node
/**
 * Social Sentinel via Google Custom Search API
 * 
 * Uses the official Google Custom Search JSON API to find X.com posts.
 * Filters: "90068" OR "90046" OR "90069" OR "Hollywood Hills"
 * Timeframe: Past 24 hours (dateRestrict='d')
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

// Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const searchApiKey = process.env.GOOGLE_SEARCH_API_KEY || process.env.GOOGLE_MAPS_API_KEY; // Fallback
const searchCx = process.env.GOOGLE_SEARCH_CX;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

if (!searchApiKey || !searchCx) {
    console.error('❌ Missing Google Search credentials (GOOGLE_SEARCH_API_KEY or GOOGLE_SEARCH_CX)');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const HIGH_PRIORITY_KEYWORDS = ['Fire', 'Smoke', 'LAPD', 'Emergency', 'Blaze', 'Combustion'];
// Exact query requested: site:x.com ("90068" OR "90046" OR "90069" OR "Hollywood Hills")
const SEARCH_QUERY = 'site:x.com ("90068" OR "90046" OR "90069" OR "Hollywood Hills" OR "Beachwood Canyon" OR "Laurel Canyon" OR "Runyon Canyon" OR "Sunset Plaza" OR "Bird Streets" OR "Hollywood Dell" OR "Outpost Estates")';

async function searchGoogleAPI() {
    const url = new URL('https://www.googleapis.com/customsearch/v1');
    url.searchParams.append('key', searchApiKey);
    url.searchParams.append('cx', searchCx);
    url.searchParams.append('q', SEARCH_QUERY);
    url.searchParams.append('dateRestrict', 'h[1]'); // Restrict to past 1 hour (aligns with hourly cron)
    url.searchParams.append('sort', 'date'); // Sort by date (newest first)

    console.log(`🔍 Searching API: ${SEARCH_QUERY}`);

    try {
        const response = await fetch(url.toString());

        if (!response.ok) {
            const err = await response.json();
            throw new Error(`Google API Error: ${err.error?.message || response.statusText}`);
        }

        const data = await response.json();
        const results = [];

        if (!data.items) {
            console.log('   ℹ️ No items found in API response.');
            return [];
        }

        for (const item of data.items) {
            // Extract handle from title if possible (e.g. "Author (@handle) ...")
            let handle = 'Unknown';
            // Default title format: "Name (@handle) on X: '...'"
            const handleMatch = item.title.match(/\(@([^\)]+)\)/);
            if (handleMatch) handle = handleMatch[1];

            // Fallback: try to guess from link
            if (handle === 'Unknown' && item.link) {
                const linkMatch = item.link.match(/x\.com\/([^\/]+)/);
                if (linkMatch) handle = linkMatch[1];
            }

            const fullText = `${item.title} ${item.snippet}`;

            // Priority Check
            const isHighPriority = HIGH_PRIORITY_KEYWORDS.some(kw =>
                fullText.toLowerCase().includes(kw.toLowerCase())
            );

            console.log(`   🐦 Found: @${handle} - ${item.title.slice(0, 50)}...`);

            results.push({
                source_name: 'Search Sentinel (X)',
                title: item.title,
                description: item.snippet,
                url: item.link, // Unique ID
                category: 'Social Pulse',
                priority: isHighPriority ? 1 : 3,
                published_at: new Date().toISOString(), // We could try to parse meta tags if available, but API doesn't give clean iso date in main fields
                metadata: {
                    search_metadata: item.pagemap // Store extra metadata just in case
                }
            });
        }

        return results;

    } catch (error) {
        console.error(`❌ API Request failed: ${error.message}`);
        return [];
    }
}

async function main() {
    console.log('\n🕵️ Search Sentinel (Official API) Starting...\n');

    const items = await searchGoogleAPI();

    if (items.length === 0) {
        console.log('\n⚠️ No relevant items found.');
    } else {
        console.log(`\n✅ Staging ${items.length} items for ingest...`);

        const { data, error } = await supabase
            .from('neighborhood_intel')
            .upsert(items, { onConflict: 'url', ignoreDuplicates: true })
            .select();

        if (error) {
            console.error('❌ Database Error:', error.message);
        } else {
            console.log(`✅ Successfully synced ${data.length} items.`);
        }
    }

    console.log('\n✨ Done!\n');
}

main();
