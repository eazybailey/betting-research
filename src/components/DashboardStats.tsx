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
    },
    {
      label: 'Value Alerts',
      value: stats.valueAlerts.toString(),
      color: stats.valueAlerts > 0 ? 'text-red-600' : 'text-gray-600',
    },
    {
      label: 'API Requests Used',
      value: stats.requestsUsed?.toString() ?? 'N/A',
      color: 'text-gray-600',
    },
    {
      label: 'API Requests Left',
      value: stats.requestsRemaining?.toString() ?? 'N/A',
      color:
        stats.requestsRemaining !== null && stats.requestsRemaining < 100
          ? 'text-amber-600'
          : 'text-gray-600',
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
        </div>
      ))}
    </div>
  );
}
