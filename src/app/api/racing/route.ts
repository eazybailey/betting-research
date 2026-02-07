import { NextRequest, NextResponse } from 'next/server';
import { fetchRacecards, transformRacecardsToEvents } from '@/lib/racing-api';

export const dynamic = 'force-dynamic';

/**
 * GET /api/racing
 * GET /api/racing?day=today
 * GET /api/racing?day=tomorrow
 *
 * Fetches horse racing racecards from The Racing API and transforms
 * them into the same OddsApiEvent format used by the rest of the dashboard.
 */
export async function GET(request: NextRequest) {
  try {
    const username = process.env.RACING_API_USERNAME;
    const password = process.env.RACING_API_PASSWORD;

    if (!username || !password) {
      return NextResponse.json(
        {
          data: null,
          error:
            'Racing API credentials not configured. Add RACING_API_USERNAME and RACING_API_PASSWORD to your Vercel Environment Variables, then redeploy.',
        },
        { status: 200 }
      );
    }

    const { searchParams } = new URL(request.url);
    const day = (searchParams.get('day') || 'today') as 'today' | 'tomorrow';

    const result = await fetchRacecards(username, password, day);

    if (!result.data) {
      return NextResponse.json({
        data: null,
        error: result.error,
      });
    }

    const events = transformRacecardsToEvents(result.data);

    return NextResponse.json({
      data: events,
      error: null,
      racecardCount: result.data.length,
      source: 'the-racing-api',
    });
  } catch (err) {
    console.error('Racing API route error:', err);
    return NextResponse.json({
      data: null,
      error: `Racing API route error: ${err instanceof Error ? err.message : String(err)}`,
    });
  }
}
