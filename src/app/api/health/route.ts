import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const hasOddsApiKey = Boolean(process.env.ODDS_API_KEY);
  const hasSupabase = isSupabaseConfigured();

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      oddsApi: hasOddsApiKey ? 'configured' : 'missing ODDS_API_KEY',
      supabase: hasSupabase ? 'configured' : 'missing Supabase credentials',
    },
  });
}
