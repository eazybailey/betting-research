import {
  OddsApiSport,
  OddsApiEvent,
  ApiResponse,
} from './types';
import {
  ODDS_API_BASE_URL,
  DEFAULT_REGION,
  DEFAULT_MARKETS,
  DEFAULT_ODDS_FORMAT,
} from './constants';

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
    const response = await fetch(url, { next: { revalidate: 3600 } });

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

  // Look for horse racing keys — try exact matches first, then partial
  const horseRacingKeys = [
    'horse_racing',
    'horse_racing_uk',
    'horseracing',
    'horseracing_uk',
  ];

  for (const key of horseRacingKeys) {
    const sport = result.data.find((s) => s.key === key && s.active);
    if (sport) return sport.key;
  }

  // Fallback: search by title or group
  const byTitle = result.data.find(
    (s) =>
      s.active &&
      (s.title.toLowerCase().includes('horse') ||
        s.group.toLowerCase().includes('horse'))
  );
  if (byTitle) return byTitle.key;

  console.warn(
    'Could not find horse racing sport key. Available sports:',
    result.data.map((s) => `${s.key} (${s.title})`).join(', ')
  );
  return null;
}

/**
 * Fetch current odds for a given sport from The Odds API.
 * Returns events with bookmaker odds for all runners.
 */
export async function fetchOdds(
  apiKey: string,
  sportKey: string
): Promise<ApiResponse<OddsApiEvent[]>> {
  try {
    const params = new URLSearchParams({
      apiKey,
      regions: DEFAULT_REGION,
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
 * Some APIs expose multiple horse racing categories (e.g., per country).
 */
export async function fetchHorseRacingOdds(
  apiKey: string
): Promise<ApiResponse<OddsApiEvent[]>> {
  const result = await fetchSports(apiKey);
  if (!result.data) {
    return { data: null, error: result.error || 'Failed to fetch sports', apiUsage: getApiUsage() };
  }

  // Find all active horse racing sport keys
  const horseRacingKeys = result.data
    .filter(
      (s) =>
        s.active &&
        (s.key.includes('horse') ||
          s.title.toLowerCase().includes('horse') ||
          s.group.toLowerCase().includes('horse'))
    )
    .map((s) => s.key);

  if (horseRacingKeys.length === 0) {
    return {
      data: [],
      error: null,
      apiUsage: getApiUsage(),
    };
  }

  // Fetch odds for each horse racing sport key
  const allEvents: OddsApiEvent[] = [];
  for (const key of horseRacingKeys) {
    const oddsResult = await fetchOdds(apiKey, key);
    if (oddsResult.data) {
      allEvents.push(...oddsResult.data);
    }
  }

  return { data: allEvents, error: null, apiUsage: getApiUsage() };
}
