const https = require('https');

const BASE_URL = 'https://services.arcgis.com/RmCCgQtiZLDCtblq/arcgis/rest/services';
const CANDIDATES = [
    'Assessor_Parcel',
    'Assessor_Parcels',
    'Parcel_Boundaries',
    'Parcels',
    'Parcel',
    'LA_County_Parcels'
];

async function checkUrl(name) {
    const url = `${BASE_URL}/${name}/FeatureServer/0/query?where=1=1&resultRecordCount=1&f=json`;
    console.log(`Testing: ${name}...`);

    return new Promise(resolve => {
        https.get(url, (res) => {
            if (res.statusCode !== 200) {
                resolve({ name, status: res.statusCode, valid: false });
                return;
            }
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.error) resolve({ name, valid: false, error: json.error.message });
                    else resolve({ name, valid: true, fields: json.fields ? json.fields.map(f => f.name).slice(0, 5) : [] });
                } catch {
                    resolve({ name, valid: false, error: 'Invalid JSON' });
                }
            });
        }).on('error', () => resolve({ name, error: 'Network Error', valid: false }));
    });
}

async function run() {
    console.log('🕵️ Probing ArcGIS Endpoints...');
    for (const name of CANDIDATES) {
        const result = await checkUrl(name);
        if (result.valid) {
            console.log(`✅ FOUND: ${result.name}`);
            console.log(`   Sample Fields: ${result.fields.join(', ')}`);
            // print full url
            console.log(`   URL: ${BASE_URL}/${result.name}/FeatureServer/0`);
        } else {
            console.log(`❌ ${result.name}: ${result.error || result.status}`);
        }
    }
}

run();
