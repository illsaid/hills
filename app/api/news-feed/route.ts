
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        const filePath = path.join(process.cwd(), 'data', 'news_feed.json');

        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ items: [], updated_at: null });
        }

        const fileContents = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(fileContents);

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error reading news feed:', error);
        return NextResponse.json({ error: 'Failed to load news feed' }, { status: 500 });
    }
}
