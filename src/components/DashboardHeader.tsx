'use client';

import { DashboardStats } from '@/lib/types';

interface DashboardHeaderProps {
  stats: DashboardStats | null;
  isLoading: boolean;
  isRefetching: boolean;
  onRefresh: () => void;
  onToggleSettings: () => void;
}

export default function DashboardHeader({
  stats,
  isLoading,
  isRefetching,
  onRefresh,
  onToggleSettings,
}: DashboardHeaderProps) {
  const lastRefreshed = stats?.lastRefreshed
    ? new Date(stats.lastRefreshed).toLocaleTimeString('en-GB')
    : null;

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Title */}
        <div>
          <h1 className="text-lg font-bold text-gray-900">
            Odds Aggregator — Value Detection
          </h1>
          <p className="text-xs text-gray-400">
            UK Horse Racing &middot; Phase 1 MVP
          </p>
        </div>

        {/* Stats + controls */}
        <div className="flex items-center gap-4">
          {/* Quick stats */}
          {stats && (
            <div className="hidden sm:flex items-center gap-3 text-xs text-gray-500">
              <span>
                <strong className="text-gray-700">{stats.racesToday}</strong> races
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

          {/* Action buttons */}
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
    </header>
  );
}
