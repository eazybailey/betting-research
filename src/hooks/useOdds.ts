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
import { evaluateRunner } from '@/lib/lay-engine';
import { REFRESH_INTERVAL_MS } from '@/lib/constants';

/**
 * Transform raw events into our Race domain model,
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

        // Opening odds: prefer Supabase historical data (first snapshot captured),
        // then fall back to worst bookmaker price as proxy
        const openingKey = `${event.id}::${name}`;
        const supabaseOpening = openingOdds.get(openingKey);
        const initialOdds = supabaseOpening ?? worstPrice?.price ?? currentOdds;
        const hasDbOpening = supabaseOpening !== undefined;

        const compression =
          initialOdds !== null && currentOdds !== null
            ? priceCompression(initialOdds, currentOdds)
            : null;

        const signal =
          compression !== null
            ? valueSignal(compression, settings.thresholds)
            : 'none';

        // Run lay engine evaluation
        const layDecision = evaluateRunner({
          eventId: event.id,
          runnerName: name,
          initialOdds,
          currentOdds,
          averageOdds,
          bankroll: settings.bankroll,
          commission: settings.commission,
          kellyMultiplier: settings.kellyMultiplier,
          maxLiabilityPct: settings.maxLiabilityPct,
          minStake: settings.minStake,
          modelParams: {
            alpha: settings.modelAlpha,
            beta: settings.modelBeta,
          },
        });

        return {
          runnerName: name,
          bookmakerOdds: prices,
          bestCurrentOdds: currentOdds,
          bestBookmaker: bestPrice?.bookmakerTitle ?? null,
          worstBookmaker: worstPrice?.bookmakerTitle ?? null,
          initialOdds,
          hasDbOpening,
          averageOdds,
          impliedProbability:
            averageOdds !== null ? impliedProbability(averageOdds) * 100 : null,
          currentImpliedProbability:
            currentOdds !== null ? impliedProbability(currentOdds) * 100 : null,
          compressionPercent: compression,
          valueSignal: signal,
          layDecision,
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
 * Returns the snapshot result for status reporting.
 */
async function saveSnapshots(events: OddsApiEvent[]): Promise<{ saved: number; error: string | null }> {
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

  if (snapshots.length === 0) return { saved: 0, error: null };

  try {
    const res = await fetch('/api/snapshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ snapshots }),
    });
    const json = await res.json();
    return { saved: json.saved || 0, error: json.error || null };
  } catch (err) {
    console.error('Failed to save snapshots:', err);
    return { saved: 0, error: String(err) };
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
        // Use the lowest opening price across bookmakers (best for lay)
        const price = parseFloat(row.back_price);
        if (isNaN(price)) continue;
        const existing = map.get(key);
        if (!existing || price < existing) {
          map.set(key, price);
        }
      }
    }
  } catch {
    // Supabase not available, opening odds will be null
  }

  return map;
}

/**
 * Fetch racing events from The Racing API.
 * Fetches both today and tomorrow to capture early opening odds.
 */
async function fetchEvents(): Promise<OddsApiEvent[]> {
  const [todayRes, tomorrowRes] = await Promise.allSettled([
    fetch('/api/racing?day=today'),
    fetch('/api/racing?day=tomorrow'),
  ]);

  const allEvents: OddsApiEvent[] = [];

  // Today's races
  if (todayRes.status === 'fulfilled' && todayRes.value.ok) {
    const json = await todayRes.value.json();
    if (!json.error && json.data) {
      allEvents.push(...json.data);
    }
  } else if (todayRes.status === 'fulfilled') {
    // If today fetch failed with a response, throw to show error
    const json = await todayRes.value.json().catch(() => ({ error: `HTTP ${todayRes.value.status}` }));
    if (json.error) throw new Error(json.error);
  } else {
    throw new Error(`Failed to fetch racing data: ${todayRes.reason}`);
  }

  // Tomorrow's races (don't throw on failure — tomorrow data is bonus)
  if (tomorrowRes.status === 'fulfilled' && tomorrowRes.value.ok) {
    try {
      const json = await tomorrowRes.value.json();
      if (!json.error && json.data) {
        allEvents.push(...json.data);
      }
    } catch {
      // Ignore tomorrow parse errors
    }
  }

  return allEvents;
}

/**
 * Main hook: fetches odds from Racing API, saves snapshots, and transforms data.
 */
export function useOdds(settings: UserSettings) {
  return useQuery({
    queryKey: ['odds', 'horse_racing', settings.thresholds, settings.fieldSizeMin, settings.fieldSizeMax],
    queryFn: async () => {
      const events = await fetchEvents();

      // Save snapshots to Supabase (non-blocking, but capture result)
      let snapshotStatus = { saved: 0, error: null as string | null };
      if (events.length > 0) {
        snapshotStatus = await saveSnapshots(events);
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
      const layAlerts = races
        .flatMap((r) => r.runners)
        .filter((r) => r.layDecision?.placeLay).length;
      const valueAlerts = layAlerts || races
        .flatMap((r) => r.runners)
        .filter((r) => r.valueSignal !== 'none').length;

      const todayRaces = races.filter((r) => {
        const raceDate = new Date(r.commenceTime).toDateString();
        return raceDate === new Date().toDateString();
      });
      const tomorrowRaces = races.filter((r) => {
        const raceDate = new Date(r.commenceTime).toDateString();
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return raceDate === tomorrow.toDateString();
      });

      const stats: DashboardStats = {
        racesToday: todayRaces.length,
        racesTomorrow: tomorrowRaces.length,
        valueAlerts,
        snapshotsSaved: snapshotStatus.saved,
        supabaseConnected: snapshotStatus.error === null && snapshotStatus.saved > 0,
        openingOddsCount: openingOdds.size,
        lastRefreshed: new Date().toISOString(),
      };

      return { races, stats };
    },
    refetchInterval: REFRESH_INTERVAL_MS,
    staleTime: 30_000,
  });
}
