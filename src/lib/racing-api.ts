import { RacingApiRacecard, ApiResponse, OddsApiEvent } from './types';

const RACING_API_BASE_URL = 'https://api.theracingapi.com/v1';

/**
 * Fetch today's racecards from The Racing API (Standard plan endpoint).
 * Uses /v1/racecards/standard which includes bookmaker odds.
 * Falls back to /v1/racecards (Basic) if standard returns 403/404.
 */
export async function fetchRacecards(
  username: string,
  password: string,
  day: 'today' | 'tomorrow' = 'today'
): Promise<ApiResponse<RacingApiRacecard[]>> {
  try {
    const credentials = btoa(`${username}:${password}`);

    // Try Standard plan endpoint first (includes bookmaker odds)
    let url = `${RACING_API_BASE_URL}/racecards/standard?day=${day}`;
    console.log(`Racing API: fetching ${url}`);

    let response = await fetch(url, {
      headers: { Authorization: `Basic ${credentials}` },
      cache: 'no-store',
    });

    // If standard endpoint isn't available, fall back to basic
    if (response.status === 403 || response.status === 404) {
      console.log('Racing API: /racecards/standard not available, falling back to /racecards');
      url = `${RACING_API_BASE_URL}/racecards?day=${day}`;
      response = await fetch(url, {
        headers: { Authorization: `Basic ${credentials}` },
        cache: 'no-store',
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Racing API error: ${response.status} - ${errorText}`);
      return {
        data: null,
        error: `Racing API error: ${response.status}${response.status === 401 ? ' — check your RACING_API_USERNAME and RACING_API_PASSWORD in Vercel env vars' : ` — ${errorText.slice(0, 200)}`}`,
      };
    }

    const json = await response.json();

    // Handle different possible response shapes
    let racecards: RacingApiRacecard[];
    if (Array.isArray(json)) {
      racecards = json;
    } else if (json.racecards && Array.isArray(json.racecards)) {
      racecards = json.racecards;
    } else {
      console.log('Racing API unexpected response shape:', JSON.stringify(json).slice(0, 500));
      racecards = [];
    }

    // Filter out abandoned races
    racecards = racecards.filter((r: any) => !r.is_abandoned);

    console.log(`Racing API: got ${racecards.length} racecards from ${url}`);
    if (racecards.length > 0 && racecards[0].runners?.length > 0) {
      const runnerKeys = Object.keys(racecards[0].runners[0]);
      console.log('Racing API runner keys:', runnerKeys.join(', '));
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
 *
 * The Racing API runner structure (from raw debug):
 *   horse, horse_id, number, draw, jockey, trainer, form, lbs, ofr, rpr, ts, ...
 *   Standard plan adds bookmaker odds (field name TBD — checked dynamically)
 *
 * Since the dashboard pipeline (useOdds → transformEvents) builds runners
 * from bookmaker outcomes, we MUST create at least one bookmaker entry per
 * runner even when no odds are available — otherwise runners won't appear.
 */
export function transformRacecardsToEvents(racecards: RacingApiRacecard[]): OddsApiEvent[] {
  return racecards.map((race: any) => {
    const raceId = (race.race_id || `${race.course_id || race.course}_${race.date}_${race.off_time}`)
      .replace(/[^a-zA-Z0-9_]/g, '_');

    const runners = race.runners || [];
    const bookmakerMap = new Map<string, { name: string; price: number }[]>();

    for (const runner of runners) {
      const horseName = runner.horse;
      let hasOdds = false;

      // Try all known possible odds field names from the Racing API
      // Standard plan may use: odds, prices, bookmaker_odds, etc.
      const oddsFields = ['odds', 'prices', 'bookmaker_odds', 'bookmakers'];
      for (const field of oddsFields) {
        const oddsData = runner[field];
        if (oddsData && typeof oddsData === 'object' && !Array.isArray(oddsData)) {
          // Object keyed by bookmaker name → decimal price
          for (const [bookmaker, rawPrice] of Object.entries(oddsData)) {
            const price = typeof rawPrice === 'number' ? rawPrice : parseFloat(String(rawPrice));
            if (!price || price <= 0) continue;
            const existing = bookmakerMap.get(bookmaker) || [];
            existing.push({ name: horseName, price });
            bookmakerMap.set(bookmaker, existing);
            hasOdds = true;
          }
        } else if (Array.isArray(oddsData)) {
          // Array of { bookmaker: string, price: number } or similar
          for (const entry of oddsData) {
            const bk = entry.bookmaker || entry.name || entry.bookie || 'unknown';
            const rawPrice = entry.price || entry.odds || entry.decimal || entry.dec;
            const price = typeof rawPrice === 'number' ? rawPrice : parseFloat(String(rawPrice));
            if (!price || price <= 0) continue;
            const existing = bookmakerMap.get(bk) || [];
            existing.push({ name: horseName, price });
            bookmakerMap.set(bk, existing);
            hasOdds = true;
          }
        }
        if (hasOdds) break;
      }

      // Fallback: use SP decimal if available (post-race)
      if (!hasOdds && runner.sp_dec) {
        const spPrice = parseFloat(String(runner.sp_dec));
        if (spPrice > 0) {
          const existing = bookmakerMap.get('sp') || [];
          existing.push({ name: horseName, price: spPrice });
          bookmakerMap.set('sp', existing);
          hasOdds = true;
        }
      }

      // Last resort: create a placeholder entry so the runner still appears
      // in the dashboard (the pipeline creates runners from bookmaker outcomes)
      if (!hasOdds) {
        const existing = bookmakerMap.get('racecard') || [];
        existing.push({ name: horseName, price: 0 });
        bookmakerMap.set('racecard', existing);
      }
    }

    // Convert to The Odds API bookmaker format
    const bookmakers = Array.from(bookmakerMap.entries()).map(([key, outcomes]) => ({
      key: key.toLowerCase().replace(/\s+/g, '_'),
      title: key === 'sp' ? 'Starting Price' : key === 'racecard' ? 'Racecard' : key,
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

    // Build commence_time — the API returns off_time as "HH:MM" and off_dt as full datetime
    const commenceTime = race.off_dt || `${race.date}T${race.off_time}:00Z`;

    return {
      id: raceId,
      sport_key: 'horse_racing',
      sport_title: `${race.course} - ${race.race_name}`,
      commence_time: commenceTime,
      home_team: `${race.off_time} ${race.course}`,
      away_team: null,
      bookmakers,
    };
  });
}
