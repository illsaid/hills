#!/usr/bin/env node
/**
 * Debug NewsData.io API
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const newsDataApiKey = process.env.NEWSDATA_API_KEY;

async function test() {
    console.log('🔍 Testing NewsData.io API...\n');
    console.log(`API Key: ${newsDataApiKey?.slice(0, 10)}...`);

    const queries = [
        'Hollywood Hills',
        'Los Angeles fire',
        'California wildfire',
        'Los Angeles'
    ];

    for (const query of queries) {
        console.log(`\n📰 Query: "${query}"`);

        const url = new URL('https://newsdata.io/api/1/news');
        url.searchParams.append('apikey', newsDataApiKey);
        url.searchParams.append('q', query);
        url.searchParams.append('language', 'en');
        url.searchParams.append('country', 'us');

        const response = await fetch(url.toString());
        const data = await response.json();

        console.log(`   Status: ${data.status}`);
        console.log(`   Total results: ${data.totalResults || 0}`);

        if (data.results?.length) {
            console.log(`   First result: ${data.results[0].title?.slice(0, 60)}...`);
            console.log(`   Source: ${data.results[0].source_name || data.results[0].source_id}`);
        }

        if (data.message) {
            console.log(`   Message: ${data.message}`);
        }
    }
}

test();
