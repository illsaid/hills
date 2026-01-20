
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        const filePath = path.join(process.cwd(), 'data', 'maintenance_signals.json');

        if (!fs.existsSync(filePath)) {
            // Default empty state
            return NextResponse.json({
                period: "Last 30 Days",
                total_requests: 0,
                top_types: [],
                hotspots: [],
                status: "Pending Generation"
            });
        }

        const fileContents = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(fileContents);

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error reading maintenance signals:', error);
        return NextResponse.json({ error: 'Failed to load maintenance signals' }, { status: 500 });
    }
}
