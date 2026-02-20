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
  /** Finishing position from results, or null if race hasn't run */
  position?: string | null;
  /** Whether this runner won the race */
  isWinner?: boolean;
}

// settings prop kept in interface for future use (currency formatting, etc.)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function RunnerRow({ runner, settings, muted, position, isWinner }: RunnerRowProps) {
  const colors = COMPRESSION_COLORS[runner.valueSignal];
  const ld = runner.layDecision;
  const kelly = ld?.kelly;

  const rowBg = isWinner
    ? 'bg-green-50 border-l-4 border-l-green-400'
    : muted
      ? 'opacity-50'
      : ld?.placeLay
        ? 'bg-green-50'
        : colors.bg;

  // Calculate direction arrow: Betfair Exchange vs Opening Average
  const moveDirection =
    runner.openingAverageOdds !== null && runner.betfairOdds !== null
      ? runner.betfairOdds < runner.openingAverageOdds
        ? 'down'
        : runner.betfairOdds > runner.openingAverageOdds
          ? 'up'
          : 'flat'
      : null;

  return (
    <tr className={`border-b border-gray-100 ${rowBg} hover:bg-gray-50 transition-colors`}>
      {/* Horse name + position */}
      <td className="px-3 py-2">
        <div className="flex items-center gap-1.5">
          {position && (
            <span
              className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                position === '1'
                  ? 'bg-green-600 text-white'
                  : position === '2'
                    ? 'bg-gray-400 text-white'
                    : position === '3'
                      ? 'bg-amber-600 text-white'
                      : 'bg-gray-200 text-gray-600'
              }`}
              title={`Finished ${position}${position === '1' ? 'st' : position === '2' ? 'nd' : position === '3' ? 'rd' : 'th'}`}
            >
              {position}
            </span>
          )}
          <span className={`text-sm font-medium ${muted ? 'text-gray-400' : isWinner ? 'text-green-800' : 'text-gray-900'}`}>
            {runner.runnerName}
          </span>
        </div>
        {ld?.pModel !== null && ld?.pModel !== undefined && (
          <div
            className="text-[9px] text-gray-400 cursor-help"
            title="Model Probability: our estimated true win probability for this horse, derived from the opening bookmaker average using the formula P(win) = 1/(1 + α×(O-1)^β). With default settings (α=1, β=1) this equals the raw implied probability (1/odds)."
          >
            Model prob: {(ld.pModel * 100).toFixed(1)}%
          </div>
        )}
      </td>

      {/* Opening Average (all bookmakers at first DB snapshot, or current avg as proxy) */}
      <td className="px-2 py-2">
        <OddsCell
          odds={runner.openingAverageOdds}
          impliedPct={runner.impliedProbability}
          muted={muted}
        />
        <div
          className="text-[9px] text-center cursor-help"
          title={
            runner.hasDbOpening
              ? `Opening average from database: the average of all bookmaker odds captured in the first snapshot for this horse. This is the "truth anchor" — set by professional bookmakers before market forces act.`
              : `Estimated opening average: using the current average across ${runner.bookmakerCount} bookmaker(s) as a proxy because no historical snapshot exists yet in the database. Will be replaced by actual opening odds after the first snapshot saves.`
          }
        >
          <span className={runner.hasDbOpening ? 'text-green-500' : 'text-amber-500'}>
            {runner.hasDbOpening ? 'from DB' : 'live estimate'}
          </span>
        </div>
        {/* Bookmaker count and spread */}
        <div className="text-[8px] text-gray-300 text-center" title={
          runner.oddsSpread
            ? `${runner.bookmakerCount} bookmakers reporting odds. Spread: ${formatOdds(runner.oddsSpread[0])} to ${formatOdds(runner.oddsSpread[1])}`
            : `${runner.bookmakerCount} bookmaker(s) reporting odds`
        }>
          {runner.bookmakerCount} bookie{runner.bookmakerCount !== 1 ? 's' : ''}
          {runner.oddsSpread && (
            <span> ({formatOdds(runner.oddsSpread[0])}–{formatOdds(runner.oddsSpread[1])})</span>
          )}
        </div>
      </td>

      {/* Betfair Exchange price (where we place the lay bet) */}
      <td className="px-2 py-2">
        {runner.betfairOdds !== null ? (
          <OddsCell
            odds={runner.betfairOdds}
            impliedPct={runner.currentImpliedProbability}
            muted={muted}
          />
        ) : (
          <div className="text-center">
            <span className="text-xs text-gray-300">N/A</span>
            <div className="text-[9px] text-gray-300">No Betfair</div>
          </div>
        )}
      </td>

      {/* Price movement: Betfair vs Opening Average + compression */}
      <td className="px-2 py-2 text-center">
        <CompressionBadge
          compressionPercent={runner.compressionPercent}
          signal={runner.valueSignal}
        />
        {moveDirection && (
          <div className="text-[10px] mt-0.5">
            {moveDirection === 'down' && (
              <span className="text-green-600" title="Price shortened — Betfair price dropped below opening average (horse is being backed more, potential lay opportunity)">&#9660; shortened</span>
            )}
            {moveDirection === 'up' && (
              <span className="text-red-500" title="Price drifted — Betfair price is higher than opening average (horse is less favoured)">&#9650; drifted</span>
            )}
            {moveDirection === 'flat' && <span className="text-gray-400">&#8212; flat</span>}
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
              <div
                className="text-[9px] text-green-600 mt-0.5 cursor-help"
                title="Expected Value: the average profit per bet if this exact situation repeated many times. EV = (P(lose) × stake × (1-commission)) - (P(win) × liability)"
              >
                EV: £{ld.ev.toFixed(2)}
              </div>
            )}
          </div>
        ) : ld?.edge !== null && ld?.edge !== undefined ? (
          <div>
            <span
              className="text-[10px] text-gray-400 cursor-help"
              title="Edge: the difference between our model probability and the market-implied probability. Positive edge means we think the horse is less likely to win than the market suggests."
            >
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
                <span className="text-amber-500 ml-1" title="Capped by max liability setting">cap</span>
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
