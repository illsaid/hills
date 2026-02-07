const https = require('https');

// Found via search
const URL = 'https://public.gis.lacounty.gov/public/rest/services/LACounty_Cache/LACounty_Parcel/MapServer/0/query?where=AIN%20LIKE%20%275555%25%27&outFields=*&f=json&resultRecordCount=1';

console.log(`Testing URL: ${URL}`);

https.get(URL, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
        try {
            if (res.statusCode !== 200) {
                console.log(`❌ HTTP Error: ${res.statusCode}`);
                console.log(data);
                return;
            }

            const json = JSON.parse(data);
            if (json.error) {
                console.log('❌ API Error:', json.error.message);
            } else if (json.features && json.features.length > 0) {
                console.log('✅ Success! Found 1 record.');
                console.log('Fields:', Object.keys(json.features[0].attributes).join(', '));
                console.log('Sample:', JSON.stringify(json.features[0].attributes, null, 2));
            } else {
                console.log('✅ Connection OK, but no records found (Query might be too restrictive or empty).');
                console.log('JSON:', JSON.stringify(json, null, 2));
            }
        } catch (e) {
            console.log('❌ Parse Error:', e.message);
            console.log('Raw:', data.substring(0, 500));
        }
    });
}).on('error', (e) => console.log('❌ Network Error:', e.message));
