import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const hasRacingApi = Boolean(process.env.RACING_API_USERNAME && process.env.RACING_API_PASSWORD);
  const hasSupabase = isSupabaseConfigured();

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      racingApi: hasRacingApi ? 'configured' : 'missing RACING_API_USERNAME / RACING_API_PASSWORD',
      supabase: hasSupabase ? 'configured' : 'missing Supabase credentials',
    },
  });
}
