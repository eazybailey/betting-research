'use client';

import { DashboardStats as DashboardStatsType } from '@/lib/types';

interface DashboardStatsProps {
  stats: DashboardStatsType;
}

export default function DashboardStats({ stats }: DashboardStatsProps) {
  const statItems = [
    {
      label: 'Races Today',
      value: stats.racesToday.toString(),
      color: 'text-blue-600',
      subtitle: null as string | null,
    },
    {
      label: 'Tomorrow',
      value: stats.racesTomorrow.toString(),
      color: stats.racesTomorrow > 0 ? 'text-purple-600' : 'text-gray-600',
      subtitle: stats.racesTomorrow > 0 ? 'Early odds tracking' : null,
    },
    {
      label: 'Value Alerts',
      value: stats.valueAlerts.toString(),
      color: stats.valueAlerts > 0 ? 'text-red-600' : 'text-gray-600',
      subtitle: null as string | null,
    },
    {
      label: 'Database',
      value: stats.supabaseConnected
        ? `${stats.openingOddsCount} stored`
        : 'Not connected',
      color: stats.supabaseConnected ? 'text-green-600' : 'text-amber-600',
      subtitle: stats.supabaseConnected
        ? `${stats.snapshotsSaved} saved this cycle`
        : 'Check Supabase env vars',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
      {statItems.map((item) => (
        <div
          key={item.label}
          className="bg-white rounded-lg border border-gray-200 px-4 py-3"
        >
          <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">
            {item.label}
          </div>
          <div className={`text-xl font-bold ${item.color}`}>{item.value}</div>
          {item.subtitle && (
            <div className="text-[10px] text-gray-400 mt-0.5">{item.subtitle}</div>
          )}
        </div>
      ))}
    </div>
  );
}
