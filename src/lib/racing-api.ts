import { RacingApiRacecard, ApiResponse, OddsApiEvent } from './types';

const RACING_API_BASE_URL = 'https://api.theracingapi.com/v1';

/**
 * Fetch today's racecards from The Racing API.
 * Uses HTTP Basic Auth with username/password.
 */
export async function fetchRacecards(
  username: string,
  password: string,
  day: 'today' | 'tomorrow' = 'today'
): Promise<ApiResponse<RacingApiRacecard[]>> {
  try {
    // Use btoa instead of Buffer — works on both Node and Vercel Edge
    const credentials = btoa(`${username}:${password}`);
    const url = `${RACING_API_BASE_URL}/racecards?day=${day}`;

    console.log(`Racing API: fetching ${url}`);

    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${credentials}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Racing API error: ${response.status} - ${errorText}`);
      return {
        data: null,
        error: `Racing API error: ${response.status}${response.status === 401 ? ' — check your RACING_API_USERNAME and RACING_API_PASSWORD in Vercel env vars' : ` — ${errorText.slice(0, 200)}`}`,
      };
    }

    const json = await response.json();
    console.log('Racing API response keys:', Object.keys(json));

    // Handle different possible response shapes
    let racecards: RacingApiRacecard[];
    if (Array.isArray(json)) {
      // Response is a direct array of racecards
      racecards = json;
    } else if (json.racecards && Array.isArray(json.racecards)) {
      // Response is { racecards: [...] }
      racecards = json.racecards;
    } else {
      // Unknown shape — log it and return what we can
      console.log('Racing API unexpected response shape:', JSON.stringify(json).slice(0, 500));
      racecards = [];
    }

    console.log(`Racing API: got ${racecards.length} racecards`);
    if (racecards.length > 0) {
      // Log the first racecard's structure to help debug odds mapping
      const first = racecards[0];
      console.log('Racing API first racecard keys:', Object.keys(first));
      if (first.runners && first.runners.length > 0) {
        console.log('Racing API first runner keys:', Object.keys(first.runners[0]));
      }
    }

    return { data: racecards, error: null };
  } catch (err) {
    console.error('Failed to fetch racecards:', err);
    return {
      data: null,
      error: `Network error fetching racecards: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Transform Racing API racecards into OddsApiEvent format.
 * This lets horse racing data flow through the same dashboard pipeline
 * as other sports from The Odds API.
 */
export function transformRacecardsToEvents(racecards: RacingApiRacecard[]): OddsApiEvent[] {
  return racecards.map((race) => {
    // Build a unique ID from course + date + off_time
    const raceId = `${race.course_id || race.course}_${race.date}_${race.off_time}`.replace(/[^a-zA-Z0-9_]/g, '_');

    // Transform each runner's odds into the bookmaker/market/outcomes structure
    // that the existing dashboard expects.
    const bookmakerMap = new Map<string, { name: string; price: number }[]>();

    for (const runner of race.runners || []) {
      // Standard plan: runner.odds is a map of bookmaker -> decimal price
      if (runner.odds && typeof runner.odds === 'object') {
        for (const [bookmaker, rawPrice] of Object.entries(runner.odds)) {
          const price = typeof rawPrice === 'number' ? rawPrice : parseFloat(String(rawPrice));
          if (!price || price <= 0) continue;
          const existing = bookmakerMap.get(bookmaker) || [];
          existing.push({ name: runner.horse, price });
          bookmakerMap.set(bookmaker, existing);
        }
      }
      // Fallback: if no bookmaker odds, use SP decimal price
      if (bookmakerMap.size === 0 && runner.sp_dec) {
        const spPrice = parseFloat(String(runner.sp_dec));
        if (spPrice > 0) {
          const existing = bookmakerMap.get('sp') || [];
          existing.push({ name: runner.horse, price: spPrice });
          bookmakerMap.set('sp', existing);
        }
      }
    }

    // Convert bookmaker map to The Odds API bookmaker format
    const bookmakers = Array.from(bookmakerMap.entries()).map(([key, outcomes]) => ({
      key: key.toLowerCase().replace(/\s+/g, '_'),
      title: key === 'sp' ? 'Starting Price' : key,
      last_update: new Date().toISOString(),
      markets: [
        {
          key: 'h2h',
          last_update: new Date().toISOString(),
          outcomes: outcomes.map((o) => ({
            name: o.name,
            price: o.price,
          })),
        },
      ],
    }));

    return {
      id: raceId,
      sport_key: 'horse_racing',
      sport_title: `${race.course} - ${race.race_name}`,
      commence_time: `${race.date}T${race.off_time}:00Z`,
      home_team: `${race.off_time} ${race.course}`,
      away_team: null,
      bookmakers,
    };
  });
}
