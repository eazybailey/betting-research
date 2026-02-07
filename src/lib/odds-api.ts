import {
  OddsApiSport,
  OddsApiEvent,
  ApiResponse,
} from './types';
import {
  ODDS_API_BASE_URL,
  DEFAULT_MARKETS,
  DEFAULT_ODDS_FORMAT,
} from './constants';

// Well-known horse racing sport keys on The Odds API.
// These are tried directly before falling back to dynamic discovery.
const KNOWN_HORSE_RACING_KEYS = [
  'horse_racing',
  'horse_racing_gbr',
  'horse_racing_uk',
  'horse_racing_ire',
  'horse_racing_aus',
  'horse_racing_usa',
  'horseracing',
  'horseracing_uk',
];

let cachedApiUsage = {
  requestsRemaining: null as number | null,
  requestsUsed: null as number | null,
};

export function getApiUsage() {
  return { ...cachedApiUsage };
}

function extractApiUsage(headers: Headers) {
  const remaining = headers.get('x-requests-remaining');
  const used = headers.get('x-requests-used');
  if (remaining !== null) cachedApiUsage.requestsRemaining = parseInt(remaining, 10);
  if (used !== null) cachedApiUsage.requestsUsed = parseInt(used, 10);
}

/**
 * Fetch all available sports from The Odds API.
 * Used to discover the correct sport key for horse racing.
 */
export async function fetchSports(apiKey: string): Promise<ApiResponse<OddsApiSport[]>> {
  try {
    const url = `${ODDS_API_BASE_URL}/sports?apiKey=${apiKey}`;
    // Short cache — horse racing keys are dynamic (appear/disappear with race meetings)
    const response = await fetch(url, { next: { revalidate: 300 } });

    extractApiUsage(response.headers);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Odds API /sports error: ${response.status} - ${errorText}`);
      return {
        data: null,
        error: `API error: ${response.status}`,
        apiUsage: getApiUsage(),
      };
    }

    const data: OddsApiSport[] = await response.json();
    return { data, error: null, apiUsage: getApiUsage() };
  } catch (err) {
    console.error('Failed to fetch sports:', err);
    return { data: null, error: 'Network error fetching sports', apiUsage: getApiUsage() };
  }
}

/**
 * Find the horse racing sport key from available sports.
 * Horse racing may be listed under various keys depending on region.
 */
export async function findHorseRacingSportKey(apiKey: string): Promise<string | null> {
  const result = await fetchSports(apiKey);
  if (!result.data) return null;

  // Try exact matches from the known keys list first
  for (const key of KNOWN_HORSE_RACING_KEYS) {
    const sport = result.data.find((s) => s.key === key && s.active);
    if (sport) return sport.key;
  }

  // Fallback: search by title or group
  const byTitle = result.data.find(
    (s) =>
      s.active &&
      (s.title.toLowerCase().includes('horse') ||
        s.group.toLowerCase().includes('horse') ||
        s.group.toLowerCase().includes('racing'))
  );
  if (byTitle) return byTitle.key;

  console.warn(
    'Could not find horse racing sport key. Available sports:',
    result.data.map((s) => `${s.key} (${s.title}) [active=${s.active}]`).join(', ')
  );
  return null;
}

/**
 * Fetch current odds for a given sport from The Odds API.
 * Returns events with bookmaker odds for all runners.
 */
export async function fetchOdds(
  apiKey: string,
  sportKey: string,
  region: string = 'uk'
): Promise<ApiResponse<OddsApiEvent[]>> {
  try {
    const params = new URLSearchParams({
      apiKey,
      regions: region,
      markets: DEFAULT_MARKETS,
      oddsFormat: DEFAULT_ODDS_FORMAT,
    });

    const url = `${ODDS_API_BASE_URL}/sports/${sportKey}/odds?${params}`;
    const response = await fetch(url, { cache: 'no-store' });

    extractApiUsage(response.headers);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Odds API /odds error: ${response.status} - ${errorText}`);
      return {
        data: null,
        error: `API error: ${response.status}`,
        apiUsage: getApiUsage(),
      };
    }

    const data: OddsApiEvent[] = await response.json();
    return { data, error: null, apiUsage: getApiUsage() };
  } catch (err) {
    console.error('Failed to fetch odds:', err);
    return { data: null, error: 'Network error fetching odds', apiUsage: getApiUsage() };
  }
}

/**
 * Fetch odds for all discovered horse racing sport keys.
 *
 * Strategy:
 * 1. Discover active horse racing keys via /sports endpoint (1 API call, 5-min cache)
 * 2. If discovery finds nothing, fall back to trying well-known keys directly
 * 3. Report an explicit error if no horse racing data is found anywhere
 */
export async function fetchHorseRacingOdds(
  apiKey: string,
  region: string = 'uk'
): Promise<ApiResponse<OddsApiEvent[]>> {
  const allEvents: OddsApiEvent[] = [];
  const triedKeys = new Set<string>();

  // Step 1: Discover active horse racing keys via /sports endpoint.
  const sportsResult = await fetchSports(apiKey);
  let discoveredKeys: string[] = [];

  if (sportsResult.data) {
    discoveredKeys = sportsResult.data
      .filter(
        (s) =>
          s.active &&
          (s.key.includes('horse') ||
            s.key.includes('racing') ||
            s.title.toLowerCase().includes('horse') ||
            s.group.toLowerCase().includes('horse') ||
            s.group.toLowerCase().includes('racing'))
      )
      .map((s) => s.key);

    if (discoveredKeys.length > 0) {
      console.log('Horse racing: discovered active keys:', discoveredKeys);
    } else {
      console.warn(
        'Horse racing: no active keys found via discovery.',
        'Available sports:',
        sportsResult.data.map((s) => `${s.key} [active=${s.active}]`).join(', ')
      );
    }
  } else {
    console.error('Horse racing: /sports endpoint failed:', sportsResult.error);
  }

  // Fetch odds for all discovered keys
  for (const key of discoveredKeys) {
    triedKeys.add(key);
    const oddsResult = await fetchOdds(apiKey, key, region);
    if (oddsResult.data && oddsResult.data.length > 0) {
      allEvents.push(...oddsResult.data);
    }
  }

  // Step 2: If discovery returned nothing, fall back to well-known keys.
  // This handles the case where /sports is stale, lists keys as inactive,
  // or uses a key format we didn't match on.
  if (allEvents.length === 0) {
    const fallbackKeys = KNOWN_HORSE_RACING_KEYS.filter((k) => !triedKeys.has(k));
    if (fallbackKeys.length > 0) {
      console.log('Horse racing: trying known fallback keys:', fallbackKeys);
      for (const key of fallbackKeys) {
        triedKeys.add(key);
        const oddsResult = await fetchOdds(apiKey, key, region);
        if (oddsResult.data && oddsResult.data.length > 0) {
          allEvents.push(...oddsResult.data);
          // Found data — no need to try remaining fallbacks
          break;
        }
      }
    }
  }

  if (allEvents.length === 0) {
    return {
      data: [],
      error: 'No horse racing events found. Tried keys: ' + Array.from(triedKeys).join(', ') +
        '. Check server logs for discovery details.',
      apiUsage: getApiUsage(),
    };
  }

  return { data: allEvents, error: null, apiUsage: getApiUsage() };
}
