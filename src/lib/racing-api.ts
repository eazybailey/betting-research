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

    // Filter out abandoned races and non-UK/IRE races (no bookmaker odds for other regions)
    racecards = racecards.filter((r: any) => {
      if (r.is_abandoned) return false;
      // Standard plan only has bookmaker odds for UK (GB) & Ireland (IRE)
      const region = (r.region || '').toUpperCase();
      return region === 'GB' || region === 'IRE';
    });

    console.log(`Racing API: got ${racecards.length} racecards from ${url}`);
    if (racecards.length > 0 && racecards[0].runners?.length > 0) {
      const runnerKeys = Object.keys(racecards[0].runners[0]);
      console.log('Racing API runner keys:', runnerKeys.join(', '));
    }

    return { data: racecards, error: null, meta: { url, status: response.status } };
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
      if (!horseName) continue;

      let hasOdds = false;

      // Racing API Standard plan: runner.odds is an array of
      // { bookmaker: "Bet365", fractional: "11/2", decimal: "6.5", ... }
      const oddsArray = runner.odds;
      if (Array.isArray(oddsArray) && oddsArray.length > 0) {
        for (const entry of oddsArray) {
          const bk = String(entry.bookmaker || 'unknown');
          const decStr = String(entry.decimal || '');
          const price = parseFloat(decStr);
          if (isNaN(price) || price <= 0) continue; // skip "SP" and invalid values
          const existing = bookmakerMap.get(bk) || [];
          existing.push({ name: horseName, price });
          bookmakerMap.set(bk, existing);
          hasOdds = true;
        }
      }

      // Fallback: use SP decimal if available (post-race)
      if (!hasOdds && runner.sp_dec) {
        const spPrice = parseFloat(String(runner.sp_dec));
        if (!isNaN(spPrice) && spPrice > 0) {
          const existing = bookmakerMap.get('sp') || [];
          existing.push({ name: horseName, price: spPrice });
          bookmakerMap.set('sp', existing);
          hasOdds = true;
        }
      }

      // Last resort: create a placeholder so the runner still appears
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
