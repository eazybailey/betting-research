'use client';

import { useState } from 'react';
import { useOdds } from '@/hooks/useOdds';
import { useSettings } from '@/hooks/useSettings';
import DashboardHeader from '@/components/DashboardHeader';
import DashboardStats from '@/components/DashboardStats';
import RaceCard from '@/components/RaceCard';
import SettingsPanel from '@/components/SettingsPanel';

export default function Dashboard() {
  const { settings, updateSettings, resetSettings } = useSettings();
  const [sport, setSport] = useState('horse_racing');
  const [region, setRegion] = useState('uk');
  const { data, isLoading, isError, error, isRefetching, refetch } = useOdds(settings, sport, region);
  const [showSettings, setShowSettings] = useState(false);

  const races = data?.races ?? [];
  const stats = data?.stats ?? null;

  const isHorseRacing = sport === 'horse_racing' || sport === 'auto_horse_racing';

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader
        stats={stats}
        isLoading={isLoading}
        isRefetching={isRefetching}
        sport={sport}
        region={region}
        onSportChange={setSport}
        onRegionChange={setRegion}
        onRefresh={() => refetch()}
        onToggleSettings={() => setShowSettings((s) => !s)}
      />

      <main className="max-w-7xl mx-auto px-4 py-4">
        {/* Stats bar */}
        {stats && <DashboardStats stats={stats} />}

        {/* Loading state */}
        {isLoading && (
          <div className="text-center py-20">
            <div className="inline-block w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mb-3" />
            <p className="text-sm text-gray-500">Loading odds data...</p>
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <h3 className="text-sm font-semibold text-red-800 mb-1">
              Failed to load odds
            </h3>
            <p className="text-xs text-red-600">
              {error instanceof Error ? error.message : 'Unknown error'}
            </p>
            {error instanceof Error &&
              (error.message.includes('ODDS_API_KEY') || error.message.includes('Racing API credentials')) && (
                <div className="mt-2 text-xs text-red-500">
                  <p className="font-medium">Setup required:</p>
                  <ol className="list-decimal ml-4 mt-1 space-y-0.5">
                    {error.message.includes('Racing API') ? (
                      <>
                        <li>
                          Sign up at{' '}
                          <span className="font-mono">theracingapi.com</span>
                        </li>
                        <li>Get your username and password</li>
                        <li>
                          Add{' '}
                          <span className="font-mono">
                            RACING_API_USERNAME
                          </span>{' '}
                          and{' '}
                          <span className="font-mono">
                            RACING_API_PASSWORD
                          </span>{' '}
                          to Vercel Environment Variables
                        </li>
                        <li>Redeploy on Vercel</li>
                      </>
                    ) : (
                      <>
                        <li>
                          Sign up at{' '}
                          <span className="font-mono">the-odds-api.com</span>
                        </li>
                        <li>Copy your API key</li>
                        <li>
                          Add{' '}
                          <span className="font-mono">
                            ODDS_API_KEY
                          </span>{' '}
                          to Vercel Environment Variables
                        </li>
                        <li>Redeploy on Vercel</li>
                      </>
                    )}
                  </ol>
                </div>
              )}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && races.length === 0 && (
          <div className="text-center py-20">
            <p className="text-sm text-gray-500 mb-1">No events available</p>
            <p className="text-xs text-gray-400">
              {isHorseRacing
                ? 'No horse racing events found. If racing is scheduled today, check the server logs for discovery details. Try selecting a different sport (e.g. Soccer — EPL) to verify data is flowing.'
                : 'No events found for this sport and region. Try a different combination.'}
            </p>
          </div>
        )}

        {/* Client diagnostic — remove once odds are displaying correctly */}
        {!isLoading && races.length > 0 && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs font-mono text-gray-700">
            <div className="font-bold mb-1">Data diagnostic (will remove once working):</div>
            <div>Races received: {races.length}</div>
            <div>First race: {races[0]?.eventName}</div>
            <div>Runners in first race: {races[0]?.runners.length}</div>
            <div>First runner name: {races[0]?.runners[0]?.runnerName ?? 'NONE'}</div>
            <div>First runner bestOdds: {String(races[0]?.runners[0]?.bestCurrentOdds ?? 'NULL')}</div>
            <div>First runner bookmakerCount: {races[0]?.runners[0]?.bookmakerOdds?.length ?? 0}</div>
            <div>First runner bestBookmaker: {races[0]?.runners[0]?.bestBookmaker ?? 'NONE'}</div>
          </div>
        )}

        {/* Race cards */}
        {races.map((race) => (
          <RaceCard key={race.eventId} race={race} settings={settings} />
        ))}
      </main>

      {/* Settings panel */}
      {showSettings && (
        <SettingsPanel
          settings={settings}
          onUpdate={updateSettings}
          onReset={resetSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
