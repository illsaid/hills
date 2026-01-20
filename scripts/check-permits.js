const LA_OPEN_DATA_URL = 'https://data.lacity.org/resource/pi9x-tg5x.json';
const TARGET_ZIP_CODES = ['90068', '90046', '90069'];

async function check() {
    try {
        const zipFilter = TARGET_ZIP_CODES.map(z => `'${z}'`).join(',');
        const url = new URL(LA_OPEN_DATA_URL);
        url.searchParams.set('$limit', '50');
        url.searchParams.set('$order', 'issue_date DESC');

        // Try exact where clause from route.ts
        const whereClause = `zip_code in (${zipFilter})`;
        url.searchParams.set('$where', whereClause);

        console.log(`fetching: ${url.toString()}`);

        const response = await fetch(url.toString(), {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'hills-ledger/1.0'
            }
        });

        if (!response.ok) {
            console.error(`Status: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.error('Body:', text);
            return;
        }

        const records = await response.json();
        console.log(`Found ${records.length} raw records.`);

        // Exact filter from route.ts
        const filtered = records.filter(r => r.apn && r.apn.length > 0 && !r.apn.includes('***'));
        console.log(`Filtered count: ${filtered.length}`);

        filtered.forEach(r => {
            console.log(`[VALID] ${r.primary_address} (APN: ${r.apn})`);
        });

    } catch (e) {
        console.error('Error:', e);
    }
}

check();
