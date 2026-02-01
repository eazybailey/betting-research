import { NextRequest, NextResponse } from 'next/server';
import { fetchHorseRacingOdds, fetchOdds, getApiUsage } from '@/lib/odds-api';

export const dynamic = 'force-dynamic';

/**
 * GET /api/odds
 * GET /api/odds?sport=soccer_epl&region=uk
 * GET /api/odds?sport=auto_horse_racing&region=uk  (default — discovers horse racing keys)
 *
 * Fetches current odds. Supports any sport key from The Odds API.
 * 'auto_horse_racing' triggers automatic discovery of horse racing sport keys.
 */
export async function GET(request: NextRequest) {
  const apiKey = process.env.ODDS_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        data: null,
        error: 'ODDS_API_KEY is not configured. Add it to your environment variables.',
        apiUsage: null,
      },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const sport = searchParams.get('sport') || 'auto_horse_racing';
  const region = searchParams.get('region') || 'uk';

  let result;

  if (sport === 'auto_horse_racing') {
    // Use the horse racing discovery logic
    result = await fetchHorseRacingOdds(apiKey, region);
  } else {
    // Fetch odds directly for the specified sport key
    result = await fetchOdds(apiKey, sport, region);
  }

  return NextResponse.json({
    data: result.data,
    error: result.error,
    apiUsage: getApiUsage(),
  });
}
