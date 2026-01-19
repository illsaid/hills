#!/usr/bin/env node
/**
 * Social Sentinel - Hybrid Approach
 * 
 * Two data sources:
 * 1. SociaVault: Monitor high-signal Twitter accounts
 * 2. Google Custom Search: Keyword-based backup search
 * 
 * Strict 48-hour filter on actual post dates.
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

// Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const sociaVaultApiKey = process.env.SOCIAVAULT_API_KEY;
const googleSearchApiKey = process.env.GOOGLE_SEARCH_API_KEY;
const googleSearchCx = process.env.GOOGLE_SEARCH_CX;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// High-priority keywords for priority assignment
const HIGH_PRIORITY_KEYWORDS = ['Fire', 'Smoke', 'LAPD', 'Emergency', 'Blaze', 'Evacuation', 'Wildfire', 'Brush'];

// Core Hills Ledger keywords for filtering
const HILLS_KEYWORDS = [
    'hollywood hills', 'beachwood canyon', 'laurel canyon',
    'runyon canyon', 'sunset plaza', 'bird streets',
    'hollywood dell', 'outpost estates', 'nichols canyon',
    'lake hollywood', 'cahuenga pass', '90068', '90046', '90069'
];

// High-signal Twitter handles to monitor
const HIGH_SIGNAL_HANDLES = [
    'LAFD', 'LAPDHQ', 'LACoFD', 'CD4LosAngeles', 'MayorOfLA',
    'KTLA', 'CBSLA', 'ABC7', 'NBCLA', 'LAist', 'LADailyNews'
];

// Strict 48-hour filter
const MAX_AGE_HOURS = 48;

/**
 * Check if a date is within the last 48 hours
 */
function isWithin48Hours(date) {
    if (!date) return false;
    const now = new Date();
    const cutoff = new Date(now.getTime() - MAX_AGE_HOURS * 60 * 60 * 1000);
    return date >= cutoff && date <= now;
}

/**
 * Parse date from text (for Google results)
 */
function parseDateFromText(text) {
    const now = new Date();

    // "X days ago"
    const daysMatch = text.match(/(\d+)\s*days?\s*ago/i);
    if (daysMatch) {
        const daysAgo = parseInt(daysMatch[1]);
        return new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    }

    // "X hours ago"
    const hoursMatch = text.match(/(\d+)\s*hours?\s*ago/i);
    if (hoursMatch) {
        const hoursAgo = parseInt(hoursMatch[1]);
        return new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);
    }

    // "X minutes ago"
    const minsMatch = text.match(/(\d+)\s*min(ute)?s?\s*ago/i);
    if (minsMatch) {
        const minsAgo = parseInt(minsMatch[1]);
        return new Date(now.getTime() - minsAgo * 60 * 1000);
    }

    // Absolute date: "Jan 19, 2026"
    const dateMatch = text.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s+(\d{4})/i);
    if (dateMatch) {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = monthNames.findIndex(m => m.toLowerCase() === dateMatch[1].toLowerCase());
        const day = parseInt(dateMatch[2]);
        const year = parseInt(dateMatch[3]);
        if (month !== -1) {
            return new Date(year, month, day);
        }
    }

    return null;
}

/**
 * Check if text contains Hills keywords
 */
function containsHillsKeyword(text) {
    if (!text) return false;
    const lowerText = text.toLowerCase();
    return HILLS_KEYWORDS.some(kw => lowerText.includes(kw.toLowerCase()));
}

// ============================================================
// SOURCE 1: SociaVault (Account Monitoring)
// ============================================================

async function fetchFromSociaVault() {
    if (!sociaVaultApiKey) {
        console.log('   ⚠️ SociaVault API key not configured');
        return [];
    }

    console.log('\n📡 SociaVault: Fetching from high-signal handles...');
    const results = [];

    for (const handle of HIGH_SIGNAL_HANDLES) {
        try {
            const url = `https://api.sociavault.com/v1/scrape/twitter/user-tweets?handle=${handle}`;
            const response = await fetch(url, {
                headers: { 'X-API-Key': sociaVaultApiKey, 'Accept': 'application/json' },
            });

            if (!response.ok) continue;

            const data = await response.json();
            const tweets = data.data?.tweets ? Object.values(data.data.tweets) : [];

            for (const tweet of tweets) {
                const legacy = tweet.legacy || tweet;
                const text = legacy.full_text || legacy.text || '';

                // Skip if no Hills keywords
                if (!containsHillsKeyword(text)) continue;

                // Parse tweet date
                const tweetDate = legacy.created_at ? new Date(legacy.created_at) : null;

                // Strict 48-hour filter
                if (!isWithin48Hours(tweetDate)) {
                    continue;
                }

                const tweetId = tweet.rest_id || legacy.id_str || '';
                const userResult = tweet.core?.user_results?.result || {};
                const userLegacy = userResult.legacy || {};
                const screenName = userLegacy.screen_name || handle;
                const displayName = userLegacy.name || screenName;

                const isHighPriority = HIGH_PRIORITY_KEYWORDS.some(kw =>
                    text.toLowerCase().includes(kw.toLowerCase())
                );

                results.push({
                    source_name: 'SociaVault (X)',
                    title: `${displayName} (@${screenName}): "${text.slice(0, 100)}..."`,
                    description: text,
                    url: `https://x.com/${screenName}/status/${tweetId}`,
                    category: 'News Feed',
                    priority: isHighPriority ? 1 : 3,
                    published_at: tweetDate.toISOString(),
                    metadata: { tweet_id: tweetId, handle: screenName, source: 'sociavault' }
                });

                console.log(`   ✅ @${screenName}: ${text.slice(0, 50)}...`);
            }

            await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
            console.error(`   ❌ @${handle}: ${error.message}`);
        }
    }

    console.log(`   📦 SociaVault found ${results.length} matching tweets`);
    return results;
}

// ============================================================
// SOURCE 2: Google Custom Search (Keyword Backup)
// ============================================================

async function fetchFromGoogleSearch() {
    if (!googleSearchApiKey || !googleSearchCx) {
        console.log('   ⚠️ Google Search API not configured');
        return [];
    }

    console.log('\n🔍 Google: Searching for Hills keywords on X.com...');
    const results = [];

    const SEARCH_QUERY = 'site:x.com ("Hollywood Hills" OR "Laurel Canyon" OR "Runyon Canyon" OR "90068" OR "90046")';

    try {
        const url = new URL('https://www.googleapis.com/customsearch/v1');
        url.searchParams.append('key', googleSearchApiKey);
        url.searchParams.append('cx', googleSearchCx);
        url.searchParams.append('q', SEARCH_QUERY);
        url.searchParams.append('dateRestrict', 'd[2]'); // Last 2 days
        url.searchParams.append('sort', 'date');
        url.searchParams.append('num', '10');

        const response = await fetch(url.toString());
        if (!response.ok) {
            console.log(`   ⚠️ Google API error: ${response.status}`);
            return [];
        }

        const data = await response.json();
        const items = data.items || [];

        for (const item of items) {
            const fullText = `${item.title} ${item.snippet}`;

            // Parse date from snippet
            const postDate = parseDateFromText(fullText);

            // Strict 48-hour filter
            if (!isWithin48Hours(postDate)) {
                console.log(`   ⏰ Skipping old: ${postDate?.toLocaleDateString() || 'unknown'}`);
                continue;
            }

            // Extract handle from URL or title
            let handle = 'Unknown';
            const handleMatch = item.title.match(/\(@([^\)]+)\)/);
            if (handleMatch) handle = handleMatch[1];
            else {
                const linkMatch = item.link?.match(/x\.com\/([^\/]+)/);
                if (linkMatch) handle = linkMatch[1];
            }

            const isHighPriority = HIGH_PRIORITY_KEYWORDS.some(kw =>
                fullText.toLowerCase().includes(kw.toLowerCase())
            );

            results.push({
                source_name: 'Google Search (X)',
                title: item.title,
                description: item.snippet,
                url: item.link,
                category: 'News Feed',
                priority: isHighPriority ? 1 : 3,
                published_at: (postDate || new Date()).toISOString(),
                metadata: { handle, source: 'google' }
            });

            console.log(`   ✅ @${handle}: ${item.title.slice(0, 50)}...`);
        }
    } catch (error) {
        console.error(`   ❌ Google Search error: ${error.message}`);
    }

    console.log(`   📦 Google found ${results.length} matching tweets`);
    return results;
}

// ============================================================
// MAIN
// ============================================================

async function purgeOldPosts() {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - MAX_AGE_HOURS);

    console.log(`🧹 Purging News Feed posts older than ${MAX_AGE_HOURS} hours...`);

    const { error, count } = await supabase
        .from('neighborhood_intel')
        .delete()
        .eq('category', 'News Feed')
        .lt('published_at', cutoff.toISOString());

    if (error) {
        console.error('   ⚠️ Purge error:', error.message);
    } else {
        console.log(`   🗑️ Purged ${count || 0} old posts`);
    }
}

async function main() {
    console.log('\n🕵️ Social Sentinel (Hybrid) Starting...\n');

    // Step 1: Purge old posts
    await purgeOldPosts();

    // Step 2: Fetch from both sources
    const sociaVaultItems = await fetchFromSociaVault();
    const googleItems = await fetchFromGoogleSearch();

    // Combine and dedupe by URL
    const seenUrls = new Set();
    const allItems = [];

    for (const item of [...sociaVaultItems, ...googleItems]) {
        if (seenUrls.has(item.url)) continue;
        seenUrls.add(item.url);
        allItems.push(item);
    }

    // Step 3: Upsert to Supabase
    if (allItems.length === 0) {
        console.log('\n⚠️ No matching items found within last 48 hours.');
    } else {
        console.log(`\n✅ Total: ${allItems.length} unique items to sync...`);

        const { data, error } = await supabase
            .from('neighborhood_intel')
            .upsert(allItems, { onConflict: 'url', ignoreDuplicates: true })
            .select();

        if (error) {
            console.error('❌ Database Error:', error.message);
        } else {
            console.log(`✅ Successfully synced ${data?.length || 0} items.`);
        }
    }

    console.log('\n✨ Done!\n');
}

main();
