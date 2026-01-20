
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        const filePath = path.join(process.cwd(), 'data', 'security_brief.json');

        if (!fs.existsSync(filePath)) {
            // Return default/empty state if file hasn't been generated yet
            return NextResponse.json({
                status: 'NORMAL',
                brief_text: 'Security brief pending generation.',
                updated_at: new Date().toISOString(),
                stats: { total: 0, wow_change: 0, yoy_change: 0 }
            });
        }

        const fileContents = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(fileContents);

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error reading security brief:', error);
        return NextResponse.json({ error: 'Failed to load security brief' }, { status: 500 });
    }
}
