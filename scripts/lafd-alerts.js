#!/usr/bin/env node
/**
 * LAFD Alerts Scraper (District 4 Filter)
 * 
 * Scraps https://lafd.org/alerts and filters for "Council District 4" or "District 4"
 * 
 * Usage:
 *   node scripts/lafd-alerts.js
 */

const { createClient } = require('@supabase/supabase-js');
const cheerio = require('cheerio');

// Load environment variables
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

// Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const BASE_URL = 'https://lafd.org';
const ALERTS_URL = 'https://lafd.org/alerts';

// Keywords to filter for District 4
const DISTRICT_KEYWORDS = ['District 4', 'Council District 4', 'CD4', 'CD 4'];

/**
 * Fetch and parse a webpage
 */
async function fetchPage(url) {
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status}`);
    }

    return await response.text();
}

/**
 * Check if text mentions District 4
 */
function isDistrict4(text) {
    if (!text) return false;
    const lowerText = text.toLowerCase();

    // Check for exact keywords
    // We want to be reasonably specific to avoid false positives (e.g. "District 41")
    // "district 4" (with space) is safer than "district 4"
    return DISTRICT_KEYWORDS.some(kw => {
        // Simple includes for now, can be regex if needed
        return lowerText.includes(kw.toLowerCase());
    });
}

/**
 * Scrape individual alert detail page
 */
async function scrapeAlertDetail(url) {
    try {
        const html = await fetchPage(url);
        const $ = cheerio.load(html);

        // Get the main content area
        // LAFD site structure often has content in .region-content or article
        const content = $('article').text() || $('.region-content').text() || $('body').text();

        return {
            isDistrict4: isDistrict4(content),
            fullText: content.trim()
        };
    } catch (error) {
        console.error(`Error scraping detail ${url}:`, error.message);
        return { isDistrict4: false, fullText: '' };
    }
}

/**
 * Main scraper function
 */
async function scrapeAlerts() {
    console.log(`📡 Fetching alerts list: ${ALERTS_URL}`);
    const html = await fetchPage(ALERTS_URL);
    const $ = cheerio.load(html);

    const alerts = [];

    // Find all links that look like alerts
    const items = $('a[href^="/alert/"], a[href^="https://lafd.org/alert/"]');

    console.log(`📋 Found ${items.length} potential alert links`);

    // Deduplicate links
    const uniqueLinks = new Set();
    const uniqueItems = [];

    items.each((i, el) => {
        const $el = $(el);
        const href = $el.attr('href');
        if (href && !uniqueLinks.has(href)) {
            uniqueLinks.add(href);
            uniqueItems.push($el);
        }
    });

    console.log(`📋 Found ${uniqueItems.length} unique alert links`);

    // Process items
    // limited to first 10 to avoid hammering the server too hard in one go
    // since we have to visit each page
    const maxItems = 10;
    let processed = 0;

    for (let i = 0; i < uniqueItems.length; i++) {
        if (processed >= maxItems) break;

        const $el = uniqueItems[i];

        const title = $el.text().trim();
        let link = $el.attr('href');

        if (!title || !link) continue;

        if (!link.startsWith('http')) {
            link = BASE_URL + link;
        }

        console.log(`   🔍 Checking: ${title} ...`);

        // Add a small delay to be nice
        await new Promise(r => setTimeout(r, 500));

        const detail = await scrapeAlertDetail(link);

        if (detail.isDistrict4) {
            console.log(`   ✅ MATCH: District 4 found in "${title}"`);

            // Extract date if possible (often in the title or a date field)
            // Naive date extraction from title usually works for LAFD "Structure Fire 01/18/2026"
            let publishedAt = new Date().toISOString();
            const dateMatch = title.match(/(\d{2}\/\d{2}\/\d{4})/);
            if (dateMatch) {
                publishedAt = new Date(dateMatch[1]).toISOString();
            }

            console.log(`   🔗 URL: ${link}`);

            alerts.push({
                source_name: 'LAFD Alert',
                title: title,
                description: detail.fullText.slice(0, 200).replace(/\s+/g, ' ').trim() + '...',
                url: link,
                category: 'Safety',
                priority: 1, // Official alerts are always High Priority
                published_at: publishedAt
            });
        } else {
            console.log(`   ❌ No match`);
        }
        processed++;
    }

    return alerts;
}

async function upsertItems(items) {
    if (items.length === 0) {
        console.log('⚠️ No D4 alerts found to insert');
        return;
    }

    const { data, error } = await supabase
        .from('neighborhood_intel')
        .upsert(items, {
            onConflict: 'url',
            ignoreDuplicates: false,
        })
        .select();

    if (error) {
        console.error('❌ Supabase error:', error.message);
        throw error;
    }

    console.log(`✅ Upserted ${data?.length || 0} D4 alerts`);
}

async function main() {
    try {
        const alerts = await scrapeAlerts();
        await upsertItems(alerts);
        console.log('\n✨ Done!\n');
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

main();
