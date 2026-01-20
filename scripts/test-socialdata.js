#!/usr/bin/env node
/**
 * Debug: Test SocialData.tools API endpoints
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const API_KEY = process.env.SOCIALDATA_API_KEY;

async function testEndpoint(name, url) {
    console.log(`\n🔍 Testing: ${name}`);
    console.log(`   URL: ${url}`);

    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Accept': 'application/json',
            },
        });

        const text = await response.text();
        console.log(`   Status: ${response.status}`);
        console.log(`   Response: ${text.slice(0, 200)}...`);

        return response.status;
    } catch (e) {
        console.log(`   Error: ${e.message}`);
        return null;
    }
}

async function main() {
    console.log('=== SocialData.tools API Endpoint Discovery ===\n');

    // Test various potential endpoints
    await testEndpoint('User Tweets', 'https://api.socialdata.tools/twitter/user/LAFD/tweets');
    await testEndpoint('User Timeline', 'https://api.socialdata.tools/twitter/users/LAFD/tweets');
    await testEndpoint('Search v1', 'https://api.socialdata.tools/twitter/search?query=Hollywood');
    await testEndpoint('Search v2', 'https://api.socialdata.tools/twitter/tweets/search?query=Hollywood');
    await testEndpoint('Timeline', 'https://api.socialdata.tools/twitter/timeline/LAFD');

    console.log('\n=== Done ===');
}

main();
