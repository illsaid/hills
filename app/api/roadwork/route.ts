import { NextResponse } from 'next/server';
import { DATA_CUTOFFS, cutoffDate } from '@/lib/dateCutoffs';

export const dynamic = 'force-dynamic';

// StreetsLA Pavement Preservation Program 2025-2026 (live feed)
const STREETLA_2526_URL = 'https://services5.arcgis.com/7nsPwEMP38bSkCjy/arcgis/rest/services/StreetsLA_PPP_2025_to_2026_SUBJECT_TO_CHANGE/FeatureServer/0/query';

// BOE Permit Information (Socrata API)
const BOE_PERMITS_URL = 'https://data.lacity.org/resource/j7mw-thyc.json';

// Council Districts 4 and 13 cover Hollywood Hills
const TARGET_COUNCIL_DISTRICTS = ['4', '13'];

// Hollywood Hills street patterns for BOE location filtering
const HOLLYWOOD_HILLS_STREETS = [
    'HOLLYWOOD',
    'SUNSET',
    'LAUREL',
    'CAHUENGA',
    'MULHOLLAND',
    'BEACHWOOD',
    'NICHOLS',
    'OUTPOST',
    'WONDERLAND',
    'CANYON',
    'FRANKLIN',
    'DOHENY',
    'HILLSIDE',
];

// Keywords that indicate traffic friction/delays
const DELAY_KEYWORDS = ['LADWP', 'TRENCHING', 'EXCAVATION', 'DWP', 'WATER', 'GAS', 'SEWER', 'TRENCH'];

interface StreetsLARecord {
    ST_NAME: string;
    PROJECT: string;
    WORKTYPE: string;
    STATUS: string;
    SCHEDULED: string;
    CD: string;
}

interface BOERecord {
    id: string;
    permitname: string;
    location: string;
    permitissuedate: string;
}

export interface FrictionResponse {
    id: string;
    project_name: string;
    street_name: string;
    work_type: string;
    work_description: string;
    status: string;
    date: string;
    source: string;
    is_traffic_delay: boolean;
}

async function fetchStreetsLA2526(): Promise<FrictionResponse[]> {
    // Query StreetsLA 2025-26 layer with Council District filter
    const cdFilter = TARGET_COUNCIL_DISTRICTS.map(cd => `CD='${cd}'`).join(' OR ');

    const url = new URL(STREETLA_2526_URL);
    url.searchParams.set('where', cdFilter);
    url.searchParams.set('outFields', 'ST_NAME,PROJECT,WORKTYPE,STATUS,SCHEDULED,CD');
    url.searchParams.set('returnGeometry', 'false');
    url.searchParams.set('resultRecordCount', '100');
    url.searchParams.set('f', 'json');

    try {
        const response = await fetch(url.toString(), {
            headers: { 'Accept': 'application/json' },
            next: { revalidate: 1800 },
        });

        if (!response.ok) {
            console.error(`StreetsLA 2526 API Error: ${response.status}`);
            return [];
        }

        const data = await response.json();
        if (data.error) {
            console.error('StreetsLA 2526 Query Error:', data.error);
            return [];
        }

        const records: StreetsLARecord[] = (data.features || []).map((f: any) => f.attributes);

        // Deduplicate by project name
        const seen = new Set<string>();
        const results: FrictionResponse[] = [];

        for (const record of records) {
            const projectKey = record.PROJECT || record.ST_NAME;
            if (seen.has(projectKey)) continue;
            seen.add(projectKey);

            const allText = `${record.PROJECT} ${record.WORKTYPE} ${record.STATUS}`.toUpperCase();
            const isTrafficDelay = DELAY_KEYWORDS.some(kw => allText.includes(kw));

            results.push({
                id: `SLA-${projectKey.substring(0, 20).replace(/\s/g, '-')}`,
                project_name: record.PROJECT || `${record.ST_NAME} Work`,
                street_name: record.ST_NAME || 'Unknown Street',
                work_type: record.WORKTYPE || 'Pavement Work',
                work_description: `${record.WORKTYPE} - ${record.PROJECT}`,
                status: record.STATUS || record.SCHEDULED || 'Scheduled',
                date: 'FY 25-26',
                source: 'StreetsLA PPP',
                is_traffic_delay: isTrafficDelay,
            });
        }

        return results;
    } catch (error) {
        console.error('StreetsLA 2526 Fetch Error:', error);
        return [];
    }
}

async function fetchBOEExcavations(): Promise<FrictionResponse[]> {
    // Query BOE permits issued after July 2025 for excavation work
    const url = new URL(BOE_PERMITS_URL);
    url.searchParams.set('$limit', '100');
    const boeCutoff = cutoffDate(DATA_CUTOFFS.ROADWORK).split('T')[0];
    url.searchParams.set('$where', `permitissuedate > '${boeCutoff}' AND (permitname like '%Excavation%' OR permitname like '%Class (A)%')`);
    url.searchParams.set('$order', 'permitissuedate DESC');
    url.searchParams.set('$select', 'id,permitname,location,permitissuedate');

    try {
        const response = await fetch(url.toString(), {
            headers: { 'Accept': 'application/json' },
            next: { revalidate: 1800 },
        });

        if (!response.ok) {
            console.error(`BOE API Error: ${response.status}`);
            return [];
        }

        const records: BOERecord[] = await response.json();

        // Filter to Hollywood Hills area streets
        const filteredRecords = records.filter(record => {
            if (!record.location) return false;
            const locationUpper = record.location.toUpperCase();
            return HOLLYWOOD_HILLS_STREETS.some(street => locationUpper.includes(street));
        });

        return filteredRecords.map(record => {
            const allText = `${record.permitname} ${record.location}`.toUpperCase();
            const isTrafficDelay = DELAY_KEYWORDS.some(kw => allText.includes(kw)) ||
                record.permitname?.includes('Excavation');

            // Format the date
            const issueDate = record.permitissuedate ?
                new Date(record.permitissuedate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) :
                'Recent';

            return {
                id: `BOE-${record.id}`,
                project_name: record.permitname || 'Street Excavation',
                street_name: record.location || 'Unknown Location',
                work_type: record.permitname?.includes('Excavation') ? 'EXCAVATION' : 'PERMIT',
                work_description: `${record.permitname} at ${record.location}`,
                status: `Issued ${issueDate}`,
                date: issueDate,
                source: 'BOE Permit',
                is_traffic_delay: isTrafficDelay,
            };
        });
    } catch (error) {
        console.error('BOE Fetch Error:', error);
        return [];
    }
}

export async function GET() {
    try {
        // Fetch from both sources in parallel
        const [streetsLA, boe] = await Promise.all([
            fetchStreetsLA2526(),
            fetchBOEExcavations(),
        ]);

        // Combine and sort by date relevance (BOE first as they have specific dates)
        const friction = [...boe, ...streetsLA];

        return NextResponse.json({
            success: true,
            count: friction.length,
            sources: {
                streetsla: streetsLA.length,
                boe: boe.length,
            },
            friction,
        });
    } catch (error: any) {
        console.error('Neighborhood Friction API Error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
