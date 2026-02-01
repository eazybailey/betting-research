'use client';

import { DashboardStats } from '@/lib/types';
import { SPORT_OPTIONS, REGION_OPTIONS } from '@/lib/constants';

interface DashboardHeaderProps {
  stats: DashboardStats | null;
  isLoading: boolean;
  isRefetching: boolean;
  sport: string;
  region: string;
  onSportChange: (sport: string) => void;
  onRegionChange: (region: string) => void;
  onRefresh: () => void;
  onToggleSettings: () => void;
}

export default function DashboardHeader({
  stats,
  isLoading,
  isRefetching,
  sport,
  region,
  onSportChange,
  onRegionChange,
  onRefresh,
  onToggleSettings,
}: DashboardHeaderProps) {
  const lastRefreshed = stats?.lastRefreshed
    ? new Date(stats.lastRefreshed).toLocaleTimeString('en-GB')
    : null;

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="max-w-7xl mx-auto">
        {/* Top row: title + controls */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              Odds Aggregator — Value Detection
            </h1>
            <p className="text-xs text-gray-400">Phase 1 MVP</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Refresh indicator */}
            <div className="flex items-center gap-2">
              {lastRefreshed && (
                <span className="text-[10px] text-gray-400">
                  Updated {lastRefreshed}
                </span>
              )}
              {isRefetching && (
                <span className="inline-block w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              )}
            </div>

            <button
              onClick={onRefresh}
              disabled={isLoading || isRefetching}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              {isRefetching ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              onClick={onToggleSettings}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
            >
              Settings
            </button>
          </div>
        </div>

        {/* Bottom row: sport/region selectors + quick stats */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Sport selector */}
            <div className="flex items-center gap-1.5">
              <label className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">
                Sport
              </label>
              <select
                value={sport}
                onChange={(e) => onSportChange(e.target.value)}
                className="text-xs border border-gray-200 rounded px-2 py-1 bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                {SPORT_OPTIONS.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Region selector */}
            <div className="flex items-center gap-1.5">
              <label className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">
                Region
              </label>
              <select
                value={region}
                onChange={(e) => onRegionChange(e.target.value)}
                className="text-xs border border-gray-200 rounded px-2 py-1 bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                {REGION_OPTIONS.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick stats */}
          {stats && (
            <div className="hidden sm:flex items-center gap-3 text-xs text-gray-500">
              <span>
                <strong className="text-gray-700">{stats.racesToday}</strong> events
              </span>
              <span className="text-gray-300">|</span>
              <span>
                <strong className={stats.valueAlerts > 0 ? 'text-red-600' : 'text-gray-700'}>
                  {stats.valueAlerts}
                </strong>{' '}
                alerts
              </span>
              {stats.requestsRemaining !== null && (
                <>
                  <span className="text-gray-300">|</span>
                  <span title="Odds API requests remaining today">
                    API: <strong className="text-gray-700">{stats.requestsRemaining}</strong> left
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
