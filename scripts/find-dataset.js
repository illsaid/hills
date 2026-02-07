const https = require('https');

const QUERY = 'Assessor';
const DOMAIN = 'data.lacounty.gov';

const url = `https://${DOMAIN}/api/catalog/v1?q=${QUERY}&limit=10`;

console.log(`🔍 Searching ${DOMAIN} for "${QUERY}"...`);

https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (!json.results || json.results.length === 0) {
                console.log('❌ No results found.');
                return;
            }

            console.log('✅ Found Datasets:');
            json.results.forEach(r => {
                const name = r.resource.name;
                const id = r.resource.id;
                const description = r.resource.description ? r.resource.description.substring(0, 50) + '...' : 'No description';
                console.log(`\n🆔 ID: ${id}`);
                console.log(`📝 Name: ${name}`);
                console.log(`📄 Desc: ${description}`);
                console.log(`🔗 API: https://${DOMAIN}/resource/${id}.json`);
            });

        } catch (e) {
            console.error('Error parsing response:', e.message);
            console.log('Raw:', data.substring(0, 200));
        }
    });
}).on('error', (e) => {
    console.error('Request failed:', e.message);
});
