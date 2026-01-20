#!/usr/bin/env node
/**
 * Test SociaVault user-tweets endpoint
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const API_KEY = process.env.SOCIAVAULT_API_KEY;

async function main() {
    const url = `https://api.sociavault.com/v1/scrape/twitter/user-tweets?handle=LAFD`;

    console.log('🔍 Testing SociaVault user-tweets...');
    console.log(`URL: ${url}`);

    const response = await fetch(url, {
        headers: {
            'X-API-Key': API_KEY,
            'Accept': 'application/json',
        },
    });

    console.log(`Status: ${response.status}`);

    if (response.ok) {
        const data = await response.json();
        console.log('\n📦 Response structure:');
        console.log('Keys:', Object.keys(data));

        if (data.data?.tweets) {
            const tweets = Object.values(data.data.tweets);
            console.log(`\n✅ Found ${tweets.length} tweets`);

            if (tweets.length > 0) {
                const tweet = tweets[0];
                console.log('\n📝 First tweet sample:');
                console.log('  rest_id:', tweet.rest_id);
                console.log('  __typename:', tweet.__typename);

                // Find the full_text
                const legacy = tweet.legacy || tweet;
                console.log('  full_text:', legacy.full_text?.slice(0, 100));
                console.log('  created_at:', legacy.created_at);

                // User info
                const user = tweet.core?.user_results?.result?.legacy || {};
                console.log('  screen_name:', user.screen_name);
            }
        } else {
            console.log('Response:', JSON.stringify(data, null, 2).slice(0, 1000));
        }
    } else {
        const text = await response.text();
        console.log('Error:', text);
    }
}

main();
