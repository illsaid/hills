
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        const filePath = path.join(process.cwd(), 'data', 'activity_index.json');

        if (!fs.existsSync(filePath)) {
            return NextResponse.json({
                activity_status: 'PENDING',
                brief_text: 'Activity index pending generation.',
                updated_at: new Date().toISOString(),
                total_calls: 0,
                call_breakdown: {}
            });
        }

        const fileContents = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(fileContents);

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error reading activity index:', error);
        return NextResponse.json({ error: 'Failed to load activity index' }, { status: 500 });
    }
}
