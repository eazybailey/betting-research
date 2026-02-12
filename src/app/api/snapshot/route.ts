import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { OddsSnapshot } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * POST /api/snapshot
 * Save odds snapshots to Supabase.
 * Body: { snapshots: OddsSnapshot[] }
 *
 * Uses a single batch query to check which event+runner combos already have
 * opening snapshots, then marks new ones accordingly. Much faster than
 * checking each snapshot individually.
 */
export async function POST(request: NextRequest) {
  const supabase = getServiceSupabase();

  if (!supabase) {
    return NextResponse.json(
      { error: 'Supabase is not configured', saved: 0 },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const snapshots: OddsSnapshot[] = body.snapshots;

    if (!snapshots || !Array.isArray(snapshots) || snapshots.length === 0) {
      return NextResponse.json(
        { error: 'No snapshots provided', saved: 0 },
        { status: 400 }
      );
    }

    // Batch-fetch all existing opening snapshots in ONE query
    // Get unique event+runner combos from the incoming snapshots
    const uniqueKeys = new Set<string>();
    const eventIds = new Set<string>();
    for (const s of snapshots) {
      uniqueKeys.add(`${s.event_id}::${s.runner_name}`);
      eventIds.add(s.event_id);
    }

    // Query all existing openings for these events at once
    const existingOpenings = new Set<string>();
    const { data: existingData } = await supabase
      .from('odds_snapshots')
      .select('event_id, runner_name')
      .eq('is_opening', true)
      .in('event_id', Array.from(eventIds));

    if (existingData) {
      for (const row of existingData) {
        existingOpenings.add(`${row.event_id}::${row.runner_name}`);
      }
    }

    // Mark snapshots: first occurrence of each event+runner gets is_opening = true
    const openingsMarkedThisBatch = new Set<string>();
    const snapshotsToInsert = snapshots.map((snapshot) => {
      const key = `${snapshot.event_id}::${snapshot.runner_name}`;
      const alreadyHasOpening = existingOpenings.has(key) || openingsMarkedThisBatch.has(key);

      if (!alreadyHasOpening) {
        openingsMarkedThisBatch.add(key);
      }

      return {
        ...snapshot,
        is_opening: !alreadyHasOpening,
      };
    });

    const { data, error } = await supabase
      .from('odds_snapshots')
      .insert(snapshotsToInsert)
      .select('id');

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json(
        { error: error.message, saved: 0 },
        { status: 500 }
      );
    }

    return NextResponse.json({
      error: null,
      saved: data?.length || 0,
      newOpenings: openingsMarkedThisBatch.size,
    });
  } catch (err) {
    console.error('Snapshot save error:', err);
    return NextResponse.json(
      { error: 'Failed to save snapshots', saved: 0 },
      { status: 500 }
    );
  }
}
