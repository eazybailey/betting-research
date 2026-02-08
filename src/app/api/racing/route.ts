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
    const raw = searchParams.get('raw') === 'true';

    const result = await fetchRacecards(username, password, day);

    if (!result.data) {
      return NextResponse.json({
        data: null,
        error: result.error,
      });
    }

    // Debug mode: return raw Racing API data (first racecard + first runner)
    // so we can see the actual field names and odds structure
    if (raw) {
      const firstRace = result.data[0] || null;
      const firstRunner = firstRace?.runners?.[0] || null;
      return NextResponse.json({
        racecardCount: result.data.length,
        raceKeys: firstRace ? Object.keys(firstRace) : [],
        runnerKeys: firstRunner ? Object.keys(firstRunner) : [],
        sampleRace: firstRace ? {
          course: firstRace.course,
          date: firstRace.date,
          off_time: firstRace.off_time,
          race_name: firstRace.race_name,
          field_size: firstRace.field_size,
          region: firstRace.region,
        } : null,
        sampleRunner: firstRunner,
        source: 'the-racing-api',
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
