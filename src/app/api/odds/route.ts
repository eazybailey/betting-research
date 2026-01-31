import { NextResponse } from 'next/server';
import { fetchHorseRacingOdds, getApiUsage } from '@/lib/odds-api';

export const dynamic = 'force-dynamic';

export async function GET() {
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

  const result = await fetchHorseRacingOdds(apiKey);

  return NextResponse.json({
    data: result.data,
    error: result.error,
    apiUsage: getApiUsage(),
  });
}
