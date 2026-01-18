import { NextResponse } from 'next/server';

// CD4 Press Release and Tourism URLs
const CD4_SOURCES = {
    pressReleases: 'https://cd4.lacity.gov/press-releases',
    hollywoodHillsTourism: 'https://cd4.lacity.gov/hollywood-hills-tourism',
};

// Keywords for filtering relevant content
const RELEVANT_KEYWORDS = ['TOURISM', 'RSO', 'FIRE', 'ZONING', 'HOLLYWOOD SIGN', 'RENT', 'HILLSIDE', 'TOUR BUS', 'TRAFFIC'];

// Impact categorization keywords
const LOGISTICS_KEYWORDS = ['TRAFFIC CONTROL', 'TRAFFIC', 'TOUR BUS', 'SHUTTLE', 'ROAD CLOSURE', 'TRANSPORTATION', 'PARKING'];
const PROPERTY_KEYWORDS = ['RENT', 'ZONING', 'RSO', 'HOUSING', 'ORDINANCE', 'STABILIZATION', 'BUILDING', 'PLANNING'];

export interface LegislativeUpdate {
    id: string;
    title: string;
    category: string;
    date: string;
    summary: string;
    impact_label: 'Logistics Update' | 'Property Intelligence' | null;
    source_url: string;
    source_name: string;
}

// Parse press releases from CD4 website
// Since we can't reliably scrape in real-time, we use a curated dataset
// This function could be updated to use a scraper or RSS feed when available
function getCD4Updates(): LegislativeUpdate[] {
    // Sample data based on actual CD4 press releases and Hollywood Hills tourism content
    const updates: LegislativeUpdate[] = [
        {
            id: 'cd4-rso-2025',
            title: 'Council Moves to Update the Rent Stabilization Ordinance for the First Time in Forty Years',
            category: 'Housing',
            date: 'Oct 2025',
            summary: 'Major RSO updates including new tenant protections and rent increase limits for Hollywood Hills rental properties.',
            impact_label: 'Property Intelligence',
            source_url: 'https://cd4.lacity.gov/press-releases/council-moves-to-update-rso/',
            source_name: 'CD4 Press Release',
        },
        {
            id: 'cd4-single-stair-2025',
            title: 'Council Permits Single-Stairway Buildings to Spur Housing Growth',
            category: 'Planning',
            date: 'Aug 2025',
            summary: 'New zoning ordinance allows single-stairway residential buildings, affecting hillside development.',
            impact_label: 'Property Intelligence',
            source_url: 'https://cd4.lacity.gov/press-releases/council-moves-to-permit-single-stairway-buildings/',
            source_name: 'CD4 Press Release',
        },
        {
            id: 'cd4-housing-motions-2025',
            title: 'Councilmember Raman Introduces Suite of Motions to Greenlight More Housing in LA',
            category: 'Housing',
            date: 'Jul 2025',
            summary: 'New motions to cut red tape for housing production with potential zoning changes in hillside areas.',
            impact_label: 'Property Intelligence',
            source_url: 'https://cd4.lacity.gov/press-releases/councilmember-raman-introduces-motions-to-greenlight-housing-production/',
            source_name: 'CD4 Press Release',
        },
        {
            id: 'cd4-tour-bus-2025',
            title: 'Tour Bus Regulations on Mulholland Drive and Hollywood Hills',
            category: 'Tourism',
            date: 'Ongoing',
            summary: 'LADOT traffic control measures for tour buses on Mulholland Dr. Tour buses may be ticketed for stopping on restricted hillside streets.',
            impact_label: 'Logistics Update',
            source_url: 'https://cd4.lacity.gov/hollywood-hills-tourism',
            source_name: 'Hollywood Hills Tourism',
        },
        {
            id: 'cd4-hollywood-sign-2025',
            title: 'Hollywood Hills Working Group: Traffic and Tourism Management',
            category: 'Tourism',
            date: 'Monthly',
            summary: 'Working group addressing Hollywood Sign traffic, visitor center proposals, and shuttle options to reduce private vehicles.',
            impact_label: 'Logistics Update',
            source_url: 'https://cd4.lacity.gov/hollywood-hills-tourism',
            source_name: 'Hollywood Hills Tourism',
        },
    ];

    // Filter to only relevant keywords
    return updates.filter(update => {
        const textToCheck = `${update.title} ${update.summary} ${update.category}`.toUpperCase();
        return RELEVANT_KEYWORDS.some(kw => textToCheck.includes(kw));
    });
}

export async function GET() {
    try {
        const updates = getCD4Updates();

        return NextResponse.json({
            success: true,
            count: updates.length,
            sources: CD4_SOURCES,
            updates,
        });
    } catch (error: any) {
        console.error('Legislative Sentinel API Error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
