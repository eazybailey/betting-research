import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/history?eventId=xxx
 * GET /api/history?eventId=xxx&runnerName=yyy
 * GET /api/history?opening=true  (fetch all opening snapshots)
 *
 * Retrieve historical odds snapshots.
 */
export async function GET(request: NextRequest) {
  const supabase = getServiceSupabase();

  if (!supabase) {
    return NextResponse.json(
      { data: null, error: 'Supabase is not configured' },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get('eventId');
  const runnerName = searchParams.get('runnerName');
  const openingOnly = searchParams.get('opening') === 'true';

  try {
    // Special mode: fetch all opening snapshots (used by dashboard to get initial odds)
    if (openingOnly) {
      const { data, error } = await supabase
        .from('odds_snapshots')
        .select('event_id, runner_name, back_price, is_opening')
        .eq('is_opening', true);

      if (error) {
        console.error('Supabase query error:', error);
        return NextResponse.json(
          { data: null, error: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ data, error: null });
    }

    // Standard mode: fetch snapshots for a specific event
    if (!eventId) {
      return NextResponse.json(
        { data: null, error: 'eventId is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('odds_snapshots')
      .select('*')
      .eq('event_id', eventId)
      .order('snapshot_time', { ascending: true });

    if (runnerName) {
      query = query.eq('runner_name', runnerName);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json(
        { data: null, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data, error: null });
  } catch (err) {
    console.error('History fetch error:', err);
    return NextResponse.json(
      { data: null, error: 'Failed to fetch history' },
      { status: 500 }
    );
  }
}
