'use client';

import { RunnerOdds, UserSettings } from '@/lib/types';
import { COMPRESSION_COLORS } from '@/lib/constants';
import { formatOdds } from '@/lib/calculations';
import OddsCell from './OddsCell';
import CompressionBadge from './CompressionBadge';

interface RunnerRowProps {
  runner: RunnerOdds;
  settings: UserSettings;
  muted?: boolean;
}

export default function RunnerRow({ runner, settings, muted }: RunnerRowProps) {
  const colors = COMPRESSION_COLORS[runner.valueSignal];
  const ld = runner.layDecision;
  const kelly = ld?.kelly;

  const rowBg = muted
    ? 'opacity-50'
    : ld?.placeLay
      ? 'bg-green-50'
      : colors.bg;

  const bookmakerCount = runner.bookmakerOdds.filter((p) => p.price > 0).length;

  // Calculate direction arrow for price movement
  const moveDirection =
    runner.initialOdds !== null && runner.bestCurrentOdds !== null
      ? runner.bestCurrentOdds < runner.initialOdds
        ? 'down'
        : runner.bestCurrentOdds > runner.initialOdds
          ? 'up'
          : 'flat'
      : null;

  return (
    <tr className={`border-b border-gray-100 ${rowBg} hover:bg-gray-50 transition-colors`}>
      {/* Horse name */}
      <td className="px-3 py-2">
        <span className={`text-sm font-medium ${muted ? 'text-gray-400' : 'text-gray-900'}`}>
          {runner.runnerName}
        </span>
        {ld?.pModel !== null && ld?.pModel !== undefined && (
          <div className="text-[9px] text-gray-400">
            Model: {(ld.pModel * 100).toFixed(1)}%
          </div>
        )}
      </td>

      {/* Opening odds (first captured from DB, or worst bookmaker as proxy) */}
      <td className="px-2 py-2">
        <div className="text-center">
          <div className={`text-sm font-mono font-semibold ${muted ? 'text-gray-400' : 'text-gray-900'}`}>
            {formatOdds(runner.initialOdds)}
          </div>
          <div className="text-[9px] text-gray-400">
            {runner.hasDbOpening ? 'from DB' : 'est.'}
          </div>
        </div>
      </td>

      {/* Current best odds (lowest across all bookmakers) */}
      <td className="px-2 py-2">
        <OddsCell
          odds={runner.bestCurrentOdds}
          impliedPct={runner.currentImpliedProbability}
          muted={muted}
        />
      </td>

      {/* Market average odds (consensus from all bookmakers) */}
      <td className="px-2 py-2">
        <OddsCell
          odds={runner.averageOdds}
          impliedPct={runner.impliedProbability}
          muted={muted}
        />
        <div className="text-[9px] text-gray-400 text-center">
          {bookmakerCount} bookies
        </div>
      </td>

      {/* Price movement + edge */}
      <td className="px-2 py-2 text-center">
        <CompressionBadge
          compressionPercent={runner.compressionPercent}
          signal={runner.valueSignal}
        />
        {moveDirection && (
          <div className="text-[10px] mt-0.5">
            {moveDirection === 'down' && <span className="text-green-600" title="Price shortened">&#9660;</span>}
            {moveDirection === 'up' && <span className="text-red-500" title="Price drifted out">&#9650;</span>}
            {moveDirection === 'flat' && <span className="text-gray-400">&#8212;</span>}
          </div>
        )}
      </td>

      {/* Lay Decision + EV */}
      <td className="px-2 py-2 text-center">
        {ld?.placeLay ? (
          <div>
            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800">
              LAY
            </span>
            {ld.ev !== null && (
              <div className="text-[9px] text-green-600 mt-0.5">
                EV: £{ld.ev.toFixed(2)}
              </div>
            )}
          </div>
        ) : ld?.edge !== null && ld?.edge !== undefined ? (
          <div>
            <span className="text-[10px] text-gray-400">
              Edge: {(ld.edge * 100).toFixed(1)}%
            </span>
            {ld.reasons.length > 0 && !ld.reasons.includes('PLACE LAY') && (
              <div className="text-[9px] text-gray-300 mt-0.5 truncate max-w-[80px]" title={ld.reasons.join(', ')}>
                {ld.reasons[0]}
              </div>
            )}
          </div>
        ) : (
          <span className="text-xs text-gray-300">-</span>
        )}
      </td>

      {/* Best bookmaker */}
      <td className="px-2 py-2">
        <span className="text-xs text-gray-500 truncate block max-w-[100px]">
          {runner.bestBookmaker || '-'}
        </span>
      </td>

      {/* Kelly stake (from lay engine) */}
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
            <div className="text-[9px] text-gray-400">
              +£{kelly.profitIfLoses.toFixed(2)} / -£{kelly.lossIfWins.toFixed(2)}
            </div>
          </div>
        ) : (
          <span className="text-xs text-gray-300">-</span>
        )}
      </td>
    </tr>
  );
}
