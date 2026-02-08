'use client';

import { useQuery } from '@tanstack/react-query';
import { OddsApiEvent, Race, RunnerOdds, BookmakerPrice, OddsSnapshot, DashboardStats } from '@/lib/types';
import { UserSettings } from '@/lib/types';
import {
  impliedProbability,
  priceCompression,
  valueSignal,
  bookPercentage,
} from '@/lib/calculations';
import { REFRESH_INTERVAL_MS } from '@/lib/constants';

/**
 * Transform raw Odds API events into our Race domain model,
 * incorporating opening odds from snapshots.
 */
function transformEvents(
  events: OddsApiEvent[],
  openingOdds: Map<string, number>,
  settings: UserSettings
): Race[] {
  return events.map((event) => {
    // Collect all unique runner names across all bookmakers
    const runnerMap = new Map<string, BookmakerPrice[]>();

    for (const bookmaker of event.bookmakers) {
      for (const market of bookmaker.markets) {
        if (market.key !== 'h2h') continue;
        for (const outcome of market.outcomes) {
          const existing = runnerMap.get(outcome.name) || [];
          existing.push({
            bookmaker: bookmaker.key,
            bookmakerTitle: bookmaker.title,
            price: outcome.price,
            lastUpdate: bookmaker.last_update,
          });
          runnerMap.set(outcome.name, existing);
        }
      }
    }

    const runners: RunnerOdds[] = Array.from(runnerMap.entries()).map(
      ([name, prices]) => {
        // Filter out placeholder entries (price <= 0) before finding best odds
        const realPrices = prices.filter((p) => p.price > 0);

        // Find best (lowest) current odds — for lay betting, lower odds = better for us
        const sortedPrices = [...realPrices].sort((a, b) => a.price - b.price);
        const bestPrice = sortedPrices[0] ?? null;
        const worstPrice = sortedPrices[sortedPrices.length - 1] ?? null;

        const currentOdds = bestPrice?.price ?? null;

        // Average (consensus) odds across all bookmakers
        const averageOdds =
          realPrices.length > 0
            ? realPrices.reduce((sum, p) => sum + p.price, 0) / realPrices.length
            : null;

        // Opening odds: prefer Supabase historical data, then fall back to
        // the HIGHEST bookmaker price as a proxy for the initial/wide price.
        // The spread between widest and tightest bookmaker represents market
        // compression even without historical snapshots.
        const openingKey = `${event.id}::${name}`;
        const supabaseOpening = openingOdds.get(openingKey);
        const initialOdds = supabaseOpening ?? worstPrice?.price ?? currentOdds;

        const compression =
          initialOdds !== null && currentOdds !== null
            ? priceCompression(initialOdds, currentOdds)
            : null;

        const signal =
          compression !== null
            ? valueSignal(compression, settings.thresholds)
            : 'none';

        return {
          runnerName: name,
          bookmakerOdds: prices,
          bestCurrentOdds: currentOdds,
          bestBookmaker: bestPrice?.bookmakerTitle ?? null,
          worstBookmaker: worstPrice?.bookmakerTitle ?? null,
          initialOdds,
          averageOdds,
          impliedProbability:
            averageOdds !== null ? impliedProbability(averageOdds) * 100 : null,
          currentImpliedProbability:
            currentOdds !== null ? impliedProbability(currentOdds) * 100 : null,
          compressionPercent: compression,
          valueSignal: signal,
        };
      }
    );

    const allBestOdds = runners
      .map((r) => r.bestCurrentOdds)
      .filter((o): o is number => o !== null);

    const runnerCount = runners.length;
    const withinFilter =
      runnerCount >= settings.fieldSizeMin &&
      runnerCount <= settings.fieldSizeMax;

    return {
      eventId: event.id,
      eventName: event.home_team || event.sport_title || 'Unknown Race',
      sportKey: event.sport_key,
      commenceTime: event.commence_time,
      runnerCount,
      runners,
      bookPercentage:
        allBestOdds.length > 0 ? bookPercentage(allBestOdds) : null,
      withinFieldSizeFilter: withinFilter,
    };
  });
}

/**
 * Save current odds as snapshots to Supabase via our API route.
 */
async function saveSnapshots(events: OddsApiEvent[]): Promise<void> {
  const snapshots: OddsSnapshot[] = [];

  for (const event of events) {
    for (const bookmaker of event.bookmakers) {
      for (const market of bookmaker.markets) {
        if (market.key !== 'h2h') continue;
        for (const outcome of market.outcomes) {
          // Skip placeholder entries with no real odds
          if (outcome.price <= 0) continue;
          snapshots.push({
            event_id: event.id,
            event_name: event.home_team || event.sport_title || 'Unknown',
            sport_key: event.sport_key,
            commence_time: event.commence_time,
            bookmaker: bookmaker.key,
            runner_name: outcome.name,
            back_price: outcome.price,
            lay_price: null,
            is_opening: false, // The API route will determine this
          });
        }
      }
    }
  }

  if (snapshots.length === 0) return;

  try {
    await fetch('/api/snapshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ snapshots }),
    });
  } catch (err) {
    console.error('Failed to save snapshots:', err);
  }
}

/**
 * Fetch opening odds from Supabase for all event+runner combos.
 */
async function fetchOpeningOdds(): Promise<Map<string, number>> {
  const map = new Map<string, number>();

  try {
    const res = await fetch('/api/history?opening=true');
    if (!res.ok) return map;
    const json = await res.json();
    if (!json.data) return map;

    for (const row of json.data) {
      if (row.is_opening && row.back_price) {
        const key = `${row.event_id}::${row.runner_name}`;
        // Use the lowest opening price across bookmakers
        const existing = map.get(key);
        if (!existing || row.back_price < existing) {
          map.set(key, parseFloat(row.back_price));
        }
      }
    }
  } catch {
    // Supabase not available, opening odds will be null
  }

  return map;
}

/**
 * Fetch events from the appropriate API based on sport selection.
 * Horse racing uses The Racing API; all other sports use The Odds API.
 */
async function fetchEvents(
  sport: string,
  region: string
): Promise<{ events: OddsApiEvent[]; apiUsage: { requestsRemaining: number | null; requestsUsed: number | null } }> {
  const isHorseRacing = sport === 'auto_horse_racing' || sport === 'horse_racing';

  if (isHorseRacing) {
    // Horse racing → The Racing API
    const res = await fetch('/api/racing?day=today');
    if (!res.ok) throw new Error(`Failed to fetch racing data: ${res.status}`);
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return {
      events: json.data || [],
      apiUsage: { requestsRemaining: null, requestsUsed: null },
    };
  }

  // All other sports → The Odds API
  const params = new URLSearchParams({ sport, region });
  const res = await fetch(`/api/odds?${params}`);
  if (!res.ok) throw new Error(`Failed to fetch odds: ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return {
    events: json.data || [],
    apiUsage: json.apiUsage || { requestsRemaining: null, requestsUsed: null },
  };
}

/**
 * Main hook: fetches odds from our API, saves snapshots, and transforms data.
 */
export function useOdds(
  settings: UserSettings,
  sport: string = 'auto_horse_racing',
  region: string = 'uk'
) {
  return useQuery({
    queryKey: ['odds', sport, region, settings.thresholds, settings.fieldSizeMin, settings.fieldSizeMax],
    queryFn: async () => {
      const { events, apiUsage } = await fetchEvents(sport, region);

      // Save snapshots to Supabase (non-blocking)
      if (events.length > 0) {
        saveSnapshots(events).catch(console.error);
      }

      // Fetch opening odds from Supabase
      const openingOdds = await fetchOpeningOdds();

      // Transform into our domain model
      const races = transformEvents(events, openingOdds, settings);

      // Sort: races within field-size filter first, then by commence time
      races.sort((a, b) => {
        if (a.withinFieldSizeFilter !== b.withinFieldSizeFilter) {
          return a.withinFieldSizeFilter ? -1 : 1;
        }
        return new Date(a.commenceTime).getTime() - new Date(b.commenceTime).getTime();
      });

      // Calculate dashboard stats
      const valueAlerts = races
        .flatMap((r) => r.runners)
        .filter((r) => r.valueSignal !== 'none').length;

      const stats: DashboardStats = {
        racesToday: races.length,
        valueAlerts,
        requestsRemaining: apiUsage.requestsRemaining,
        requestsUsed: apiUsage.requestsUsed,
        lastRefreshed: new Date().toISOString(),
      };

      return { races, stats };
    },
    refetchInterval: REFRESH_INTERVAL_MS,
    staleTime: 30_000,
  });
}
