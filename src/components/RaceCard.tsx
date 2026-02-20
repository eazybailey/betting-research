'use client';

import Link from 'next/link';
import { Race, UserSettings } from '@/lib/types';
import { formatPercent } from '@/lib/calculations';
import RunnerRow from './RunnerRow';

interface RaceCardProps {
  race: Race;
  settings: UserSettings;
}

export default function RaceCard({ race, settings }: RaceCardProps) {
  const raceTime = new Date(race.commenceTime).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const raceDate = new Date(race.commenceTime).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  const isMuted = !race.withinFieldSizeFilter;
  const layRunners = race.runners.filter((r) => r.layDecision?.placeLay);
  const valueRunners = layRunners.length > 0
    ? layRunners
    : race.runners.filter((r) => r.valueSignal !== 'none');

  const hasResult = race.result?.hasResult ?? false;
  const winner = race.result?.winner ?? null;

  return (
    <div
      className={`bg-white rounded-lg border shadow-sm mb-4 overflow-hidden ${
        isMuted ? 'opacity-60 border-gray-200' : 'border-gray-200'
      }`}
    >
      {/* Race header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Link
                href={`/races/${race.eventId}`}
                className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors"
              >
                {race.eventName}
              </Link>
              {hasResult && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">
                  RESULT
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500">
              {raceDate} &middot; {raceTime}
            </div>
            {/* Winner display */}
            {winner && (
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px] font-medium text-gray-400 uppercase">Winner:</span>
                <span className="text-xs font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded">
                  {winner}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span
            className={`px-2 py-0.5 rounded ${
              race.withinFieldSizeFilter
                ? 'bg-blue-50 text-blue-700'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {race.runnerCount} runners
          </span>
          {race.bookPercentage !== null && (
            <span className="text-gray-400" title="Book percentage / overround — sum of all implied probabilities. 100% = fair book, >100% = bookmaker margin">
              Book: {formatPercent(race.bookPercentage)}
            </span>
          )}
          {valueRunners.length > 0 && (
            <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 font-semibold">
              {valueRunners.length} alert{valueRunners.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Runners table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-gray-400 border-b border-gray-100">
              <th className="px-3 py-2 font-medium">
                Horse
                {hasResult && <span className="ml-1 normal-case text-gray-300">(Pos)</span>}
              </th>
              <th
                className="px-2 py-2 font-medium text-center"
                title="Simple average of all bookmaker odds at the first snapshot captured. This is the 'truth anchor' — professional bookmaker odds before emotional market forces act."
              >
                Opening Avg
                <div className="text-[8px] normal-case tracking-normal text-gray-300 font-normal">
                  bookmaker consensus
                </div>
              </th>
              <th
                className="px-2 py-2 font-medium text-center"
                title="Current Betfair Exchange lay price — the odds at which you would lay (bet against) this horse"
              >
                Betfair
                <div className="text-[8px] normal-case tracking-normal text-gray-300 font-normal">
                  exchange lay price
                </div>
              </th>
              <th
                className="px-2 py-2 font-medium text-center"
                title="Price compression: how much the Betfair price has dropped compared to the opening bookmaker average. Positive = horse is being backed (potential lay opportunity)"
              >
                Move
                <div className="text-[8px] normal-case tracking-normal text-gray-300 font-normal">
                  compression %
                </div>
              </th>
              <th className="px-2 py-2 font-medium text-center">Lay / EV</th>
              <th className="px-2 py-2 font-medium text-right">Kelly Stake</th>
            </tr>
          </thead>
          <tbody>
            {race.runners.map((runner) => (
              <RunnerRow
                key={runner.runnerName}
                runner={runner}
                settings={settings}
                muted={isMuted}
                position={race.result?.positions.get(runner.runnerName) ?? null}
                isWinner={runner.runnerName === winner}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
