#!/usr/bin/env node
/**
 * Debug script to see what Google Custom Search actually returns
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const searchApiKey = process.env.GOOGLE_SEARCH_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
const searchCx = process.env.GOOGLE_SEARCH_CX;

const SEARCH_QUERY = 'site:x.com ("90068" OR "90046" OR "90069" OR "Hollywood Hills" OR "Beachwood Canyon" OR "Laurel Canyon" OR "Runyon Canyon" OR "Sunset Plaza" OR "Bird Streets" OR "Hollywood Dell" OR "Outpost Estates")';

async function test() {
    console.log('🔍 Testing Google Custom Search API...\n');

    const url = new URL('https://www.googleapis.com/customsearch/v1');
    url.searchParams.append('key', searchApiKey);
    url.searchParams.append('cx', searchCx);
    url.searchParams.append('q', SEARCH_QUERY);
    url.searchParams.append('sort', 'date');
    url.searchParams.append('num', '10');
    // Note: NOT using dateRestrict to see ALL results

    const response = await fetch(url.toString());
    const data = await response.json();

    if (!data.items) {
        console.log('No items returned');
        console.log('Response:', JSON.stringify(data, null, 2));
        return;
    }

    console.log(`Found ${data.items.length} results (sorted by date):\n`);

    data.items.forEach((item, i) => {
        // Extract dates from snippet
        const text = `${item.title} ${item.snippet}`;

        // Look for various date patterns
        const daysAgo = text.match(/(\d+)\s*days?\s*ago/i);
        const hoursAgo = text.match(/(\d+)\s*hours?\s*ago/i);
        const absDate = text.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}/i);

        let dateInfo = '❓ Unknown';
        if (hoursAgo) dateInfo = `⏰ ${hoursAgo[1]} hours ago`;
        else if (daysAgo) dateInfo = `📅 ${daysAgo[1]} days ago`;
        else if (absDate) dateInfo = `📆 ${absDate[0]}`;

        console.log(`${i + 1}. [${dateInfo}] ${item.title.slice(0, 60)}...`);
    });
}

test();
