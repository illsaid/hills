import { NextResponse } from 'next/server';

const LA_OPEN_DATA_URL = 'https://data.lacity.org/resource/pi9x-tg5x.json';
const TARGET_ZIP_CODES = ['90068', '90046', '90069'];

interface PermitRecord {
    permit_nbr: string;
    primary_address: string;
    zip_code: string;
    apn: string;
    permit_type: string;
    permit_sub_type?: string;
    use_desc?: string;
    work_desc?: string;
    issue_date: string;
    status_desc?: string;
    valuation?: string;
}

export interface PermitResponse {
    permit_number: string;
    address: string;
    zip_code: string;
    apn: string;
    permit_type: string;
    description: string;
    issue_date: string;
    status: string;
    valuation: string | null;
    zimas_url: string;
}

export async function GET() {
    try {
        const zipFilter = TARGET_ZIP_CODES.map(z => `'${z}'`).join(',');
        const url = new URL(LA_OPEN_DATA_URL);
        url.searchParams.set('$limit', '50');
        url.searchParams.set('$order', 'issue_date DESC');
        url.searchParams.set('$where', `zip_code in (${zipFilter})`);

        const response = await fetch(url.toString(), {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'hills-ledger/1.0',
            },
            next: { revalidate: 0 }, // Disable cache for debugging
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const records: PermitRecord[] = await response.json();

        // Transform and filter to only include records with valid APNs
        const permits: PermitResponse[] = records
            .filter(r => r.apn && r.apn.length > 0 && !r.apn.includes('***'))
            .map(record => ({
                permit_number: record.permit_nbr || 'N/A',
                address: record.primary_address || 'Unknown Address',
                zip_code: record.zip_code || '',
                apn: record.apn,
                permit_type: record.permit_type || record.permit_sub_type || 'Building',
                description: record.use_desc || record.work_desc || '',
                issue_date: record.issue_date || '',
                status: record.status_desc || 'Unknown',
                valuation: record.valuation || null,
                zimas_url: `https://zimas.lacity.org/map.aspx?apn=${record.apn}`,
            }));

        return NextResponse.json({
            success: true,
            count: permits.length,
            permits,
        });
    } catch (error: any) {
        console.error('Permits API Error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
