import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { DATA_CUTOFFS, cutoffDate } from '@/lib/dateCutoffs';

// Initialize Supabase Client (Server-Side)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; // Anon key is fine for reads if RLS allows, or use Service Key if needed
const supabase = createClient(supabaseUrl, supabaseKey);

const TARGET_ZIP_CODES = ['90068', '90046', '90069'];

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
        // Fetch from Supabase "recent_permits" cache
        const { data, error } = await supabase
            .from('recent_permits')
            .select('*')
            .in('zip_code', TARGET_ZIP_CODES)
            .gte('issue_date', cutoffDate(DATA_CUTOFFS.PERMITS))
            .order('issue_date', { ascending: false })
            .limit(50);

        if (error) {
            throw new Error(error.message);
        }

        const permits: PermitResponse[] = (data || []).map(record => ({
            permit_number: record.permit_number,
            address: record.address,
            zip_code: record.zip_code,
            apn: record.apn,
            permit_type: record.permit_type,
            description: record.description,
            issue_date: record.issue_date,
            status: record.status,
            valuation: record.valuation ? record.valuation.toString() : null,
            zimas_url: record.zimas_url || '#',
        }));

        return NextResponse.json({
            success: true,
            count: permits.length,
            permits,
            source: 'db_cache' // Indicator that we are using the cache
        });
    } catch (error: any) {
        console.error('Permits API Error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
