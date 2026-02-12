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
  ];

  return (
    <div className="grid grid-cols-2 gap-3 mb-4">
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
