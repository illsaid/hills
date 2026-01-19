#!/usr/bin/env node
/**
 * News Sentinel - NewsData.io Integration
 * 
 * Fetches news articles from NewsData.io filtered for Hills keywords.
 * Prioritizes LA Times, KTLA, LAist.
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

// Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const newsDataApiKey = process.env.NEWSDATA_API_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

if (!newsDataApiKey) {
    console.error('❌ Missing NEWSDATA_API_KEY environment variable');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Priority sources (weighted higher)
const PRIORITY_SOURCES = ['latimes', 'ktla', 'laist', 'la times', 'los angeles times'];

// High-priority keywords for alert-level priority
const HIGH_PRIORITY_KEYWORDS = ['fire', 'smoke', 'emergency', 'evacuation', 'wildfire', 'brush fire', 'lapd', 'lafd'];

// Hills and broader LA keywords for filtering (must match at least one)
const HILLS_KEYWORDS = [
    // Core Hills neighborhoods
    'hollywood hills', 'beachwood canyon', 'laurel canyon',
    'runyon canyon', 'sunset plaza', 'bird streets',
    'hollywood dell', 'outpost estates', 'nichols canyon',
    'lake hollywood', 'cahuenga pass', 'griffith park',
    'mulholland', 'hollywood sign',
    // Zip codes
    '90068', '90046', '90069',
    // Broader but relevant
    'east hollywood', 'west hollywood', 'los feliz',
    'silverlake', 'silver lake', 'echo park',
    // Landmarks
    'griffith observatory', 'hollywood bowl', 'universal studios'
];

// Only include articles from the last N hours
const MAX_AGE_HOURS = 48;

/**
 * Check if text contains Hills keywords
 */
function containsHillsKeyword(text) {
    if (!text) return false;
    const lowerText = text.toLowerCase();
    return HILLS_KEYWORDS.some(kw => lowerText.includes(kw.toLowerCase()));
}

/**
 * Check if source is a priority source
 */
function isPrioritySource(sourceName) {
    if (!sourceName) return false;
    const lowerSource = sourceName.toLowerCase();
    return PRIORITY_SOURCES.some(ps => lowerSource.includes(ps));
}

/**
 * Fetch news from NewsData.io API
 */
async function fetchNewsFromNewsData() {
    console.log('\n📰 NewsData.io: Fetching news articles...');
    const results = [];

    // More targeted search queries for the Hills area
    const searchQueries = [
        '"Hollywood Hills"',
        '"Laurel Canyon"',
        '"Griffith Park"',
        '"East Hollywood" fire',
        '"West Hollywood"'
    ];

    for (const query of searchQueries) {
        try {
            const url = new URL('https://newsdata.io/api/1/news');
            url.searchParams.append('apikey', newsDataApiKey);
            url.searchParams.append('q', query);
            url.searchParams.append('language', 'en');
            url.searchParams.append('country', 'us');

            console.log(`   Searching: "${query}"...`);

            const response = await fetch(url.toString());

            if (!response.ok) {
                console.log(`   ⚠️ NewsData API error: ${response.status}`);
                continue;
            }

            const data = await response.json();

            if (data.status !== 'success' || !data.results) {
                console.log(`   ⚠️ No results for "${query}"`);
                continue;
            }

            const now = new Date();
            const cutoff = new Date(now.getTime() - MAX_AGE_HOURS * 60 * 60 * 1000);

            for (const article of data.results) {
                // Parse article date
                let articleDate = null;
                if (article.pubDate) {
                    articleDate = new Date(article.pubDate);
                }

                // Skip old articles
                if (articleDate && articleDate < cutoff) {
                    continue;
                }

                // Require articles to contain Hills-specific keywords for local relevance
                const fullText = `${article.title || ''} ${article.description || ''} ${article.content || ''}`;
                if (!containsHillsKeyword(fullText)) {
                    continue;
                }

                // Determine priority
                const isHighPriority = HIGH_PRIORITY_KEYWORDS.some(kw =>
                    fullText.toLowerCase().includes(kw)
                );
                const isPriority = isPrioritySource(article.source_id || article.source_name);

                // Build item
                const sourceName = article.source_name || article.source_id || 'NewsData';
                const title = article.title || 'Untitled';
                const description = article.description || article.content?.slice(0, 300) || '';

                results.push({
                    source_name: `NewsData (${sourceName})`,
                    title: title,
                    description: description,
                    url: article.link,
                    category: 'News Feed',
                    priority: isHighPriority ? 1 : (isPriority ? 2 : 3),
                    published_at: (articleDate || now).toISOString(),
                    metadata: {
                        source_id: article.source_id,
                        source_name: sourceName,
                        source_type: 'news',
                        image_url: article.image_url,
                        keywords: article.keywords,
                        is_priority_source: isPriority,
                        scraped_at: now.toISOString()
                    }
                });

                console.log(`   ✅ ${sourceName}: ${title.slice(0, 50)}...`);
            }

            // Small delay between requests to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
            console.error(`   ❌ Error searching "${query}": ${error.message}`);
        }
    }

    console.log(`   📦 NewsData found ${results.length} matching articles`);
    return results;
}

/**
 * Purge old News Feed posts
 */
async function purgeOldPosts() {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - MAX_AGE_HOURS);

    console.log(`🧹 Purging News Feed posts older than ${MAX_AGE_HOURS} hours...`);

    const { error, count } = await supabase
        .from('neighborhood_intel')
        .delete()
        .eq('category', 'News Feed')
        .eq('metadata->>source_type', 'news')
        .lt('published_at', cutoff.toISOString());

    if (error) {
        console.error('   ⚠️ Purge error:', error.message);
    } else {
        console.log(`   🗑️ Purged ${count || 0} old news articles`);
    }
}

async function main() {
    console.log('\n📰 News Sentinel (NewsData.io) Starting...\n');

    // Step 1: Purge old posts
    await purgeOldPosts();

    // Step 2: Fetch news articles
    const newsItems = await fetchNewsFromNewsData();

    // Step 3: Dedupe by URL
    const seenUrls = new Set();
    const uniqueItems = newsItems.filter(item => {
        if (!item.url || seenUrls.has(item.url)) return false;
        seenUrls.add(item.url);
        return true;
    });

    // Step 4: Upsert to Supabase
    if (uniqueItems.length === 0) {
        console.log('\n⚠️ No matching news articles found.');
    } else {
        console.log(`\n✅ Total: ${uniqueItems.length} unique articles to sync...`);

        const { data, error } = await supabase
            .from('neighborhood_intel')
            .upsert(uniqueItems, { onConflict: 'url', ignoreDuplicates: true })
            .select();

        if (error) {
            console.error('❌ Database Error:', error.message);
        } else {
            console.log(`✅ Successfully synced ${data?.length || 0} news articles.`);
        }
    }

    console.log('\n✨ Done!\n');
}

main();
