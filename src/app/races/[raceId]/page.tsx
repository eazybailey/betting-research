'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useOdds } from '@/hooks/useOdds';
import { useSnapshots } from '@/hooks/useSnapshots';
import { useSettings } from '@/hooks/useSettings';
import { formatOdds, formatPercent, impliedProbability } from '@/lib/calculations';
import KellyCalculator from '@/components/KellyCalculator';
import CompressionBadge from '@/components/CompressionBadge';
import ValueAlert from '@/components/ValueAlert';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const CHART_COLORS = [
  '#3b82f6',
  '#ef4444',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#f97316',
];

export default function RaceDetailPage({
  params,
}: {
  params: Promise<{ raceId: string }>;
}) {
  const { raceId } = use(params);
  const { settings } = useSettings();
  const { data } = useOdds(settings);
  const { data: snapshots } = useSnapshots(raceId);
  const [notes, setNotes] = useState('');

  const race = data?.races.find((r) => r.eventId === raceId);

  if (!race) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <Link href="/" className="text-sm text-blue-600 hover:underline mb-4 inline-block">
          &larr; Back to dashboard
        </Link>
        <div className="text-center py-20">
          <p className="text-sm text-gray-500">Race not found or data not loaded yet.</p>
          <p className="text-xs text-gray-400 mt-1">
            Make sure the dashboard has loaded, then navigate here.
          </p>
        </div>
      </div>
    );
  }

  const raceTime = new Date(race.commenceTime).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Build price history chart data
  const chartData: Record<string, number | string>[] = [];
  if (snapshots && snapshots.length > 0) {
    // Group by snapshot_time, then by runner
    const timeGroups = new Map<string, Map<string, number>>();
    for (const snap of snapshots) {
      const time = snap.snapshot_time || snap.created_at || '';
      if (!timeGroups.has(time)) timeGroups.set(time, new Map());
      const group = timeGroups.get(time)!;
      if (snap.back_price) {
        const existing = group.get(snap.runner_name);
        // Keep the best (lowest) price per runner per time
        if (!existing || snap.back_price < existing) {
          group.set(snap.runner_name, typeof snap.back_price === 'string' ? parseFloat(snap.back_price) : snap.back_price);
        }
      }
    }

    const sortedTimes = Array.from(timeGroups.keys()).sort();
    for (const time of sortedTimes) {
      const group = timeGroups.get(time)!;
      const point: Record<string, number | string> = {
        time: new Date(time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      };
      group.forEach((price, runner) => {
        point[runner] = price;
      });
      chartData.push(point);
    }
  }

  // Get all unique runner names from snapshots for chart lines
  const chartRunners = new Set<string>();
  if (snapshots) {
    for (const snap of snapshots) {
      chartRunners.add(snap.runner_name);
    }
  }

  // Find the first value-signal runner for Kelly default
  const valueRunner = race.runners.find((r) => r.valueSignal !== 'none');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto">
          <Link href="/" className="text-xs text-blue-600 hover:underline mb-2 inline-block">
            &larr; Back to dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900">{race.eventName}</h1>
              <p className="text-xs text-gray-500">
                {raceTime} &middot; {race.runnerCount} runners &middot;{' '}
                {race.bookPercentage !== null && `Book: ${formatPercent(race.bookPercentage)}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-4 space-y-6">
        {/* Full odds comparison table */}
        <section>
          <h2 className="text-sm font-semibold text-gray-900 mb-2">
            Full Odds Comparison
          </h2>
          <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-gray-400 border-b border-gray-100">
                  <th className="px-3 py-2 font-medium sticky left-0 bg-white">Horse</th>
                  <th className="px-2 py-2 font-medium text-center">Opening Avg</th>
                  <th className="px-2 py-2 font-medium text-center">Betfair</th>
                  <th className="px-2 py-2 font-medium text-center">Compression</th>
                  <th className="px-2 py-2 font-medium text-center">Signal</th>
                  {/* Get all unique bookmakers */}
                  {Array.from(
                    new Set(
                      race.runners.flatMap((r) =>
                        r.bookmakerOdds.map((b) => b.bookmakerTitle)
                      )
                    )
                  ).map((bm) => (
                    <th key={bm} className="px-2 py-2 font-medium text-center">
                      {bm}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {race.runners.map((runner) => {
                  const bookmakers = Array.from(
                    new Set(
                      race.runners.flatMap((r) =>
                        r.bookmakerOdds.map((b) => b.bookmakerTitle)
                      )
                    )
                  );
                  return (
                    <tr
                      key={runner.runnerName}
                      className="border-b border-gray-50 hover:bg-gray-50"
                    >
                      <td className="px-3 py-2 font-medium sticky left-0 bg-white">
                        {runner.runnerName}
                      </td>
                      <td className="px-2 py-2 text-center font-mono">
                        {formatOdds(runner.openingAverageOdds)}
                        {runner.impliedProbability !== null && (
                          <div className="text-[10px] text-gray-400">
                            {formatPercent(runner.impliedProbability)}
                          </div>
                        )}
                        <div className="text-[9px] text-gray-400">
                          {runner.hasDbOpening ? 'DB' : 'est.'}
                        </div>
                      </td>
                      <td className={`px-2 py-2 text-center font-mono font-semibold ${runner.betfairOdds === null ? 'text-gray-300' : ''}`}>
                        {runner.betfairOdds !== null ? formatOdds(runner.betfairOdds) : 'N/A'}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <CompressionBadge
                          compressionPercent={runner.compressionPercent}
                          signal={runner.valueSignal}
                        />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <ValueAlert signal={runner.valueSignal} />
                      </td>
                      {bookmakers.map((bm) => {
                        const price = runner.bookmakerOdds.find(
                          (b) => b.bookmakerTitle === bm
                        );
                        const isBetfair = price?.bookmaker === 'betfair_exchange' || price?.bookmaker === 'betfair_ex';
                        const isBest =
                          price && runner.bestCurrentOdds === price.price;
                        return (
                          <td
                            key={bm}
                            className={`px-2 py-2 text-center font-mono text-xs ${
                              isBetfair ? 'font-bold text-green-700 bg-green-50' : isBest ? 'font-bold text-blue-600' : 'text-gray-500'
                            }`}
                          >
                            {price ? formatOdds(price.price) : '-'}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Price movement chart */}
        {chartData.length > 1 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-900 mb-2">
              Price Movement
            </h2>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {Array.from(chartRunners).map((runner, i) => (
                    <Line
                      key={runner}
                      type="monotone"
                      dataKey={runner}
                      stroke={CHART_COLORS[i % CHART_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Kelly calculator */}
          <KellyCalculator
            settings={settings}
            initialOdds={valueRunner?.openingAverageOdds ?? undefined}
            currentLayOdds={valueRunner?.betfairOdds ?? undefined}
          />

          {/* Notes */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Notes</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Your race analysis notes..."
              className="w-full h-48 px-3 py-2 border border-gray-200 rounded text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            <p className="text-[10px] text-gray-400 mt-1">
              Notes are stored locally and will be lost on page refresh.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
