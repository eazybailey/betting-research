import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { OddsSnapshot } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * POST /api/snapshot
 * Save odds snapshots to Supabase.
 * Body: { snapshots: OddsSnapshot[] }
 *
 * For each snapshot, checks if an opening snapshot exists for that event+runner.
 * If not, marks the first snapshot as is_opening = true.
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

    // For each snapshot, determine if it should be the opening snapshot
    const snapshotsToInsert: OddsSnapshot[] = [];

    for (const snapshot of snapshots) {
      // Check if an opening snapshot already exists for this event+runner
      const { data: existing } = await supabase
        .from('odds_snapshots')
        .select('id')
        .eq('event_id', snapshot.event_id)
        .eq('runner_name', snapshot.runner_name)
        .eq('is_opening', true)
        .limit(1);

      const isOpening = !existing || existing.length === 0;

      snapshotsToInsert.push({
        ...snapshot,
        is_opening: isOpening,
      });
    }

    const { data, error } = await supabase
      .from('odds_snapshots')
      .insert(snapshotsToInsert)
      .select();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json(
        { error: error.message, saved: 0 },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: null, saved: data?.length || 0 });
  } catch (err) {
    console.error('Snapshot save error:', err);
    return NextResponse.json(
      { error: 'Failed to save snapshots', saved: 0 },
      { status: 500 }
    );
  }
}
