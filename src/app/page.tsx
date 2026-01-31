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
  const { data, isLoading, isError, error, isRefetching, refetch } = useOdds(settings);
  const [showSettings, setShowSettings] = useState(false);

  const races = data?.races ?? [];
  const stats = data?.stats ?? null;

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader
        stats={stats}
        isLoading={isLoading}
        isRefetching={isRefetching}
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
              error.message.includes('ODDS_API_KEY') && (
                <div className="mt-2 text-xs text-red-500">
                  <p className="font-medium">Setup required:</p>
                  <ol className="list-decimal ml-4 mt-1 space-y-0.5">
                    <li>
                      Sign up at{' '}
                      <span className="font-mono">the-odds-api.com</span>
                    </li>
                    <li>Copy your API key</li>
                    <li>
                      Add{' '}
                      <span className="font-mono">
                        ODDS_API_KEY=your_key
                      </span>{' '}
                      to <span className="font-mono">.env.local</span>
                    </li>
                    <li>Restart the dev server</li>
                  </ol>
                </div>
              )}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && races.length === 0 && (
          <div className="text-center py-20">
            <p className="text-sm text-gray-500 mb-1">No races available</p>
            <p className="text-xs text-gray-400">
              Horse racing data may not be available outside of race days.
              Check back during UK racing hours.
            </p>
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
