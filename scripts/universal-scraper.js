#!/usr/bin/env node
/**
 * Universal Scraper for Neighborhood Intel
 * 
 * Usage:
 *   node scripts/universal-scraper.js '{"name":"CD4 News","url":"https://cd4.lacity.gov/press-releases/","selector":"article"}'
 * 
 * Or with a config file:
 *   node scripts/universal-scraper.js --config scripts/scraper-configs/cd4.json
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
    console.error('❌ Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Category keywords for classification
const CATEGORY_KEYWORDS = {
    Safety: ['fire', 'emergency', 'crime', 'police', 'danger', 'hazard', 'warning', 'alert', 'evacuation', '911'],
    Traffic: ['traffic', 'road', 'closure', 'detour', 'construction', 'street', 'parking', 'transportation', 'transit'],
    Housing: ['rent', 'housing', 'rso', 'zoning', 'building', 'tenant', 'landlord', 'ordinance', 'planning', 'development'],
    Tourism: ['tourism', 'tour', 'hollywood sign', 'visitor', 'shuttle', 'tourist'],
};

/**
 * Categorize text based on keyword matching
 */
function categorizeText(text) {
    const lowerText = text.toLowerCase();

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        if (keywords.some(kw => lowerText.includes(kw))) {
            return category;
        }
    }

    return 'News'; // Default category
}

/**
 * Clean and normalize text
 */
function cleanText(text) {
    if (!text) return '';
    return text
        .replace(/\s+/g, ' ')
        .replace(/[\r\n]+/g, ' ')
        .trim();
}

/**
 * Extract date from text or element
 */
function extractDate(text) {
    if (!text) return null;

    // Try to parse common date formats
    const datePatterns = [
        /(\w+ \d{1,2}, \d{4})/,  // "January 18, 2026"
        /(\d{1,2}\/\d{1,2}\/\d{4})/,  // "1/18/2026"
        /(\d{4}-\d{2}-\d{2})/,  // "2026-01-18"
    ];

    for (const pattern of datePatterns) {
        const match = text.match(pattern);
        if (match) {
            const parsed = new Date(match[1]);
            if (!isNaN(parsed.getTime())) {
                return parsed.toISOString();
            }
        }
    }

    return null;
}

/**
 * Fetch and parse a webpage
 */
async function fetchPage(url) {
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status}`);
    }

    return await response.text();
}

/**
 * Scrape items from a page using config
 */
async function scrapeItems(config) {
    console.log(`📡 Fetching: ${config.url}`);

    const html = await fetchPage(config.url);
    const $ = cheerio.load(html);

    const items = [];

    // Select all matching elements
    $(config.selector).each((index, element) => {
        const $el = $(element);

        // Extract title
        const titleSelector = config.titleSelector || 'h2, h3, .title, a';
        const title = cleanText($el.find(titleSelector).first().text() || $el.text().slice(0, 100));

        if (!title || title.length < 5) return;

        // Extract description
        const descSelector = config.descSelector || 'p, .description, .summary, .excerpt';
        const description = cleanText($el.find(descSelector).first().text()) || null;

        // Extract URL
        const urlSelector = config.urlSelector || 'a';
        let itemUrl = $el.find(urlSelector).first().attr('href') || $el.attr('href');

        // Make URL absolute if relative
        if (itemUrl && !itemUrl.startsWith('http')) {
            const baseUrl = new URL(config.url);
            itemUrl = new URL(itemUrl, baseUrl.origin).toString();
        }

        // Skip if no URL (required for deduplication)
        if (!itemUrl) {
            itemUrl = `${config.url}#item-${index}`;
        }

        // Extract date
        const dateSelector = config.dateSelector || '.date, time, .published';
        const dateText = $el.find(dateSelector).first().text() || $el.text();
        const publishedAt = extractDate(dateText);

        // Categorize based on title and description
        const category = categorizeText(`${title} ${description || ''}`);

        items.push({
            source_name: config.name,
            title,
            description,
            url: itemUrl,
            category,
            published_at: publishedAt,
        });
    });

    console.log(`📋 Found ${items.length} items`);
    return items;
}

/**
 * Upsert items to Supabase (deduplicates on URL)
 */
async function upsertItems(items) {
    if (items.length === 0) {
        console.log('⚠️ No items to insert');
        return;
    }

    // Upsert with conflict resolution on URL
    const { data, error } = await supabase
        .from('neighborhood_intel')
        .upsert(items, {
            onConflict: 'url',
            ignoreDuplicates: false, // Update existing records
        })
        .select();

    if (error) {
        console.error('❌ Supabase error:', error.message);
        throw error;
    }

    console.log(`✅ Upserted ${data?.length || 0} items`);
    return data;
}

/**
 * Main executor
 */
async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log(`
Universal Scraper for Neighborhood Intel

Usage:
  node scripts/universal-scraper.js '<json-config>'
  node scripts/universal-scraper.js --config <path-to-json>

Example Config:
  {
    "name": "CD4 News",
    "url": "https://cd4.lacity.gov/press-releases/",
    "selector": "article",
    "titleSelector": "h2",
    "descSelector": "p",
    "urlSelector": "a"
  }

Categories (auto-detected):
  - Safety: fire, emergency, crime, police
  - Traffic: traffic, road, closure, construction
  - Housing: rent, housing, RSO, zoning
  - Tourism: tourism, tour, hollywood sign
  - News: default
        `);
        process.exit(0);
    }

    let config;

    if (args[0] === '--config') {
        const fs = require('fs');
        const configPath = args[1];
        if (!configPath) {
            console.error('❌ Missing config file path');
            process.exit(1);
        }
        config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } else {
        config = JSON.parse(args[0]);
    }

    // Validate config
    if (!config.name || !config.url || !config.selector) {
        console.error('❌ Config must have: name, url, selector');
        process.exit(1);
    }

    console.log(`\n🔧 Scraper Config:`);
    console.log(`   Name: ${config.name}`);
    console.log(`   URL: ${config.url}`);
    console.log(`   Selector: ${config.selector}\n`);

    try {
        const items = await scrapeItems(config);

        if (items.length > 0) {
            console.log('\n📊 Sample items:');
            items.slice(0, 3).forEach(item => {
                console.log(`   [${item.category}] ${item.title.slice(0, 60)}...`);
            });
            console.log('');
        }

        await upsertItems(items);
        console.log('\n✨ Done!\n');
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

main();
