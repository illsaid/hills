import { NextRequest, NextResponse } from 'next/server';
import { runProvider } from '@/lib/ingest';

export async function POST(request: NextRequest) {
  try {
    const ingestKey = request.headers.get('x-ingest-key');
    const expectedKey = process.env.INGEST_KEY;

    if (!expectedKey || ingestKey !== expectedKey) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const provider = searchParams.get('provider');
    const area = searchParams.get('area') || 'hollywood-hills';

    if (!provider) {
      return NextResponse.json(
        { error: 'Missing provider parameter' },
        { status: 400 }
      );
    }

    const result = await runProvider(provider, area);

    if (result.error) {
      return NextResponse.json(
        {
          success: false,
          provider,
          area,
          ...result,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      provider,
      area,
      ...result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
