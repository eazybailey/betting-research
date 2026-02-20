'use client';

import { useState, useMemo } from 'react';
import { useOdds } from '@/hooks/useOdds';
import { useSettings } from '@/hooks/useSettings';
import DashboardHeader from '@/components/DashboardHeader';
import DashboardStats from '@/components/DashboardStats';
import RaceCard from '@/components/RaceCard';
import SettingsPanel from '@/components/SettingsPanel';

type DayTab = 'today' | 'tomorrow';

export default function Dashboard() {
  const { settings, updateSettings, resetSettings } = useSettings();
  const { data, isLoading, isError, error, isRefetching, refetch } = useOdds(settings);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<DayTab>('today');

  const races = useMemo(() => data?.races ?? [], [data?.races]);
  const stats = data?.stats ?? null;

  // Split races into today and tomorrow
  const { todayRaces, tomorrowRaces } = useMemo(() => {
    const today = new Date().toDateString();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toDateString();

    return {
      todayRaces: races.filter((r) => new Date(r.commenceTime).toDateString() === today),
      tomorrowRaces: races.filter((r) => new Date(r.commenceTime).toDateString() === tomorrowStr),
    };
  }, [races]);

  const displayedRaces = activeTab === 'today' ? todayRaces : tomorrowRaces;

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

        {/* Day tabs */}
        {!isLoading && !isError && races.length > 0 && (
          <div className="flex gap-1 mb-4 bg-white rounded-lg border border-gray-200 p-1 w-fit">
            <button
              onClick={() => setActiveTab('today')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'today'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Today
              <span className={`ml-1.5 text-xs ${activeTab === 'today' ? 'text-blue-200' : 'text-gray-400'}`}>
                {todayRaces.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('tomorrow')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'tomorrow'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Tomorrow
              <span className={`ml-1.5 text-xs ${activeTab === 'tomorrow' ? 'text-purple-200' : 'text-gray-400'}`}>
                {tomorrowRaces.length}
              </span>
            </button>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="text-center py-20">
            <div className="inline-block w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mb-3" />
            <p className="text-sm text-gray-500">Loading racing data...</p>
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <h3 className="text-sm font-semibold text-red-800 mb-1">
              Failed to load racing data
            </h3>
            <p className="text-xs text-red-600">
              {error instanceof Error ? error.message : 'Unknown error'}
            </p>
            {error instanceof Error &&
              error.message.includes('Racing API') && (
                <div className="mt-2 text-xs text-red-500">
                  <p className="font-medium">Setup required:</p>
                  <ol className="list-decimal ml-4 mt-1 space-y-0.5">
                    <li>
                      Sign up at{' '}
                      <span className="font-mono">theracingapi.com</span>
                    </li>
                    <li>Get your username and password</li>
                    <li>
                      Add{' '}
                      <span className="font-mono">RACING_API_USERNAME</span>{' '}
                      and{' '}
                      <span className="font-mono">RACING_API_PASSWORD</span>{' '}
                      to Vercel Environment Variables
                    </li>
                    <li>Redeploy on Vercel</li>
                  </ol>
                </div>
              )}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && displayedRaces.length === 0 && (
          <div className="text-center py-20">
            <p className="text-sm text-gray-500 mb-1">
              No {activeTab === 'tomorrow' ? 'tomorrow' : 'today'}&apos;s races available
            </p>
            <p className="text-xs text-gray-400">
              {activeTab === 'today'
                ? 'No UK or Ireland horse racing events found for today. Racing data updates every 3 minutes during race days.'
                : 'Tomorrow\'s racecards may not be available yet. Check back later.'}
            </p>
          </div>
        )}

        {/* Race cards */}
        {displayedRaces.map((race) => (
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
