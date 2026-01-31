'use client';

import { RunnerOdds, UserSettings, KellyResult } from '@/lib/types';
import { COMPRESSION_COLORS } from '@/lib/constants';
import { kellyLayStake, impliedProbability } from '@/lib/calculations';
import OddsCell from './OddsCell';
import CompressionBadge from './CompressionBadge';
import ValueAlert from './ValueAlert';

interface RunnerRowProps {
  runner: RunnerOdds;
  settings: UserSettings;
  muted?: boolean;
}

export default function RunnerRow({ runner, settings, muted }: RunnerRowProps) {
  const colors = COMPRESSION_COLORS[runner.valueSignal];

  // Calculate Kelly stake if value signal is active and we have the data
  let kelly: KellyResult | null = null;
  if (
    runner.valueSignal !== 'none' &&
    runner.initialOdds !== null &&
    runner.bestCurrentOdds !== null
  ) {
    kelly = kellyLayStake({
      bankroll: settings.bankroll,
      trueProb: impliedProbability(runner.initialOdds),
      currentLayOdds: runner.bestCurrentOdds,
      kellyMultiplier: settings.kellyMultiplier,
      maxLiabilityPct: settings.maxLiabilityPct,
    });
  }

  const rowBg = muted ? 'opacity-50' : colors.bg;

  return (
    <tr className={`border-b border-gray-100 ${rowBg} hover:bg-gray-50 transition-colors`}>
      {/* Horse name */}
      <td className="px-3 py-2">
        <span className={`text-sm font-medium ${muted ? 'text-gray-400' : 'text-gray-900'}`}>
          {runner.runnerName}
        </span>
      </td>

      {/* Initial odds */}
      <td className="px-2 py-2">
        <OddsCell
          odds={runner.initialOdds}
          impliedPct={runner.impliedProbability}
          muted={muted}
        />
      </td>

      {/* Best current odds */}
      <td className="px-2 py-2">
        <OddsCell
          odds={runner.bestCurrentOdds}
          impliedPct={runner.currentImpliedProbability}
          muted={muted}
        />
      </td>

      {/* Compression */}
      <td className="px-2 py-2 text-center">
        <CompressionBadge
          compressionPercent={runner.compressionPercent}
          signal={runner.valueSignal}
        />
      </td>

      {/* Value signal */}
      <td className="px-2 py-2 text-center">
        <ValueAlert signal={runner.valueSignal} />
      </td>

      {/* Best bookmaker */}
      <td className="px-2 py-2">
        <span className="text-xs text-gray-500 truncate block max-w-[100px]">
          {runner.bestBookmaker || '-'}
        </span>
      </td>

      {/* Kelly stake */}
      <td className="px-2 py-2 text-right">
        {kelly && kelly.layStake > 0 ? (
          <div className="text-xs">
            <div className="font-semibold text-gray-900">
              £{kelly.layStake.toFixed(2)}
            </div>
            <div className="text-gray-400">
              Liab: £{kelly.liability.toFixed(2)}
              {kelly.cappedByMaxLiability && (
                <span className="text-amber-500 ml-1" title="Capped by max liability">cap</span>
              )}
            </div>
          </div>
        ) : (
          <span className="text-xs text-gray-300">-</span>
        )}
      </td>
    </tr>
  );
}
