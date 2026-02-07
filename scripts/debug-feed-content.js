const http = require('http');

console.log('Testing Unified Feed API...');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/unified-feed?limit=100',
    method: 'GET',
    timeout: 5000 // 5 seconds timeout
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    res.setEncoding('utf8');
    let rawData = '';
    res.on('data', (chunk) => { rawData += chunk; });
    res.on('end', () => {
        try {
            const parsedData = JSON.parse(rawData);
            console.log('✅ Response received!');
            console.log(`Count: ${parsedData.count}`);
            if (parsedData.items) {
                console.log(`Items returned: ${parsedData.items.length}`);
                const types = {};
                parsedData.items.forEach(i => {
                    types[i.type] = (types[i.type] || 0) + 1;
                    if (i.type === 'business' || i.type === 'enforcement') {
                        console.log(`[${i.type}] ${i.published_at} - ${i.title}`);
                    }
                });
                console.log('Type breakdown:', types);
            }
        } catch (e) {
            console.error('❌ Error parsing JSON:', e.message);
        }
    });
});

req.on('error', (e) => {
    console.error(`❌ Problem with request: ${e.message}`);
});

req.end();
