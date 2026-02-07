#!/usr/bin/env node
/**
 * Safety Dispatch Worker
 * 
 * Monitors LAFD incidents for Hollywood Hills area (90068, 90046, 90069)
 * Source: Scrapes live alerts from https://lafd.org/alerts
 * Filters for "District 4" or specific zip codes/keywords
 * Cross-references with Google AQI
 * 
 * Usage:
 *   node scripts/safety-dispatch.js
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

// Configuration
const BASE_URL = 'https://lafd.org';
const ALERTS_URL = 'https://lafd.org/alerts';
const TARGET_ZIPS = ['90068', '90046', '90069'];
const DISTRICT_KEYWORDS = ['District 4', 'Council District 4', 'CD4', 'CD 4'];
const PRIORITY_1_KEYWORDS = ['BRUSH FIRE', 'STRUCTURE FIRE', 'WILDFIRE', 'BRUSH', 'HIKER'];
const PRIORITY_2_KEYWORDS = ['SMOKE', 'VEGETATION', 'RESCUE', 'COLLISION'];

// Google Air Quality API (optional)
const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const AQI_API_URL = 'https://airquality.googleapis.com/v1/currentConditions:lookup';
const HOLLYWOOD_HILLS_COORDS = { lat: 34.1164, lng: -118.3205 };

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
    return DISTRICT_KEYWORDS.some(kw => lowerText.includes(kw.toLowerCase()));
}

/**
 * Scrape individual alert detail page
 */
async function scrapeAlertDetail(url) {
    try {
        const html = await fetchPage(url);
        const $ = cheerio.load(html);
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
 * Determine incident priority
 */
function getPriority(title) {
    const upper = title.toUpperCase();
    if (PRIORITY_1_KEYWORDS.some(kw => upper.includes(kw))) return 1;
    if (PRIORITY_2_KEYWORDS.some(kw => upper.includes(kw))) return 2;
    return 3;
}

/**
 * Fetch current AQI for Hollywood Hills (optional)
 */
async function fetchAQI() {
    if (!GOOGLE_API_KEY) {
        // console.log('⚠️ No GOOGLE_MAPS_API_KEY - skipping AQI check');
        return null;
    }

    try {
        const response = await fetch(`${AQI_API_URL}?key=${GOOGLE_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                location: {
                    latitude: HOLLYWOOD_HILLS_COORDS.lat,
                    longitude: HOLLYWOOD_HILLS_COORDS.lng
                }
            })
        });

        if (!response.ok) return null;

        const data = await response.json();
        const aqi = data.indexes?.[0]?.aqi;
        console.log(`📊 Current AQI: ${aqi || 'N/A'}`);
        return aqi || null;
    } catch (error) {
        console.error('AQI fetch error:', error.message);
        return null;
    }
}

/**
 * Main scraper function
 */
async function scrapeLiveIncidents() {
    console.log(`📡 Fetching live alerts from ${ALERTS_URL}...`);
    const html = await fetchPage(ALERTS_URL);
    const $ = cheerio.load(html);

    const items = $('a[href^="/alert/"], a[href^="https://lafd.org/alert/"]');
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

    console.log(`📋 Found ${uniqueItems.length} unique alert links. Checking for District 4 matches...`);

    const safetyItems = [];
    // Limit to first 8 to avoid timeout
    const maxItems = 8;

    for (let i = 0; i < Math.min(items.length, maxItems); i++) {
        const $el = uniqueItems[i];
        const title = $el.text().trim();
        let link = $el.attr('href');

        if (!title || !link) continue;
        if (!link.startsWith('http')) link = BASE_URL + link;

        // Small delay
        await new Promise(r => setTimeout(r, 200));

        const detail = await scrapeAlertDetail(link);

        if (detail.isDistrict4) {
            console.log(`   ✅ MATCH: "${title}"`);

            // Extract date and time
            // Formats: "01/28/2026", "01-28-2026", "6:19pm", "10:22am"
            let publishedAt = new Date().toISOString(); // Default to now

            try {
                // Find Date: MM/DD/YYYY or MM-DD-YYYY
                const dateMatch = title.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
                // Find Time: HH:MMam/pm or HH:MM
                // Look in both title and body for time if possible, but title often has it or body starts with it.
                // The snippet often contains the time right after the date.
                const timeMatch = (title + " " + detail.fullText).match(/(\d{1,2}):(\d{2})\s*(am|pm|AM|PM)?/);

                if (dateMatch) {
                    const month = parseInt(dateMatch[1]);
                    const day = parseInt(dateMatch[2]);
                    const year = parseInt(dateMatch[3]);

                    let hours = 12; // Default noon if no time
                    let minutes = 0;

                    if (timeMatch) {
                        let h = parseInt(timeMatch[1]);
                        const m = parseInt(timeMatch[2]);
                        const meridiem = timeMatch[3]?.toLowerCase();

                        if (meridiem === 'pm' && h < 12) h += 12;
                        if (meridiem === 'am' && h === 12) h = 0;

                        hours = h;
                        minutes = m;
                    }

                    const dt = new Date(year, month - 1, day, hours, minutes, 0);
                    if (!isNaN(dt.getTime())) {
                        publishedAt = dt.toISOString();
                        console.log(`   🕒 Parsed Time: ${publishedAt}`);
                    }
                }
            } catch (e) {
                console.log('   ⚠️ Date parsing error, using NOW:', e.message);
            }

            const priority = getPriority(title);

            safetyItems.push({
                source_name: 'LAFD Alert',
                title: title,
                description: detail.fullText.slice(0, 200).replace(/\s+/g, ' ').trim() + '...',
                url: link,
                category: 'Safety',
                priority: priority,
                published_at: publishedAt,
                incident_id: link // Use URL as ID
            });
        }
    }

    return safetyItems;
}

/**
 * Upsert safety items to database
 */
async function upsertSafetyItems(items) {
    if (items.length === 0) {
        console.log('ℹ️ No new safety items found.');
        return;
    }

    const { data, error } = await supabase
        .from('neighborhood_intel')
        .upsert(items, {
            onConflict: 'url',
            ignoreDuplicates: false, // Update existing records with new timestamps
        })
        .select();

    if (error) {
        console.error('❌ Supabase error:', error.message);
        return;
    }

    console.log(`✅ Upserted ${data?.length || 0} safety items`);
}

/**
 * Main executor
 */
async function main() {
    console.log('\n🚨 Safety Dispatch Worker Starting (Live Scraper)...\n');

    try {
        // 1. Scrape Live Incidents
        const safetyItems = await scrapeLiveIncidents();

        // 2. Check AQI if we have high priority incidents
        const hasHighPriority = safetyItems.some(i => i.priority === 1);
        if (hasHighPriority) {
            const aqi = await fetchAQI();
            if (aqi && aqi > 100) {
                console.log(`⚠️ AQI elevated (${aqi}) - High priority fire event correlated.`);
            }
        }

        // 3. Upsert
        await upsertSafetyItems(safetyItems);

        console.log('\n✨ Done!\n');
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

main();
