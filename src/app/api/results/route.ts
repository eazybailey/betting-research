import { NextRequest, NextResponse } from 'next/server';
import { fetchResults } from '@/lib/racing-api';

export const dynamic = 'force-dynamic';

/**
 * GET /api/results
 * GET /api/results?day=today
 *
 * Fetches race results from The Racing API.
 * Returns runner positions and starting prices for completed races.
 */
export async function GET(request: NextRequest) {
  try {
    const username = process.env.RACING_API_USERNAME;
    const password = process.env.RACING_API_PASSWORD;

    if (!username || !password) {
      return NextResponse.json({
        data: null,
        error: 'Racing API credentials not configured',
      });
    }

    const { searchParams } = new URL(request.url);
    const day = (searchParams.get('day') || 'today') as 'today' | 'tomorrow';

    const result = await fetchResults(username, password, day);

    if (!result.data) {
      return NextResponse.json({ data: null, error: result.error });
    }

    return NextResponse.json({
      data: result.data,
      error: null,
      resultCount: result.data.length,
    });
  } catch (err) {
    console.error('Results API route error:', err);
    return NextResponse.json({
      data: null,
      error: `Results API route error: ${err instanceof Error ? err.message : String(err)}`,
    });
  }
}
