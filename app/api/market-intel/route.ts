
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        const filePath = path.join(process.cwd(), 'data', 'market_intel.json');

        if (!fs.existsSync(filePath)) {
            return NextResponse.json({
                quarter: "Pending",
                generated_revenue: 0,
                transaction_count: 0,
                context: "Market intelligence pending generation."
            });
        }

        const fileContents = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(fileContents);

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error reading market intel:', error);
        return NextResponse.json({ error: 'Failed to load market intel' }, { status: 500 });
    }
}
