'use client';

import { useState } from 'react';
import { kellyLayStake, impliedProbability } from '@/lib/calculations';
import { UserSettings } from '@/lib/types';

interface KellyCalculatorProps {
  settings: UserSettings;
  initialOdds?: number;
  currentLayOdds?: number;
}

export default function KellyCalculator({
  settings,
  initialOdds: defaultInitial,
  currentLayOdds: defaultLay,
}: KellyCalculatorProps) {
  const [initialOdds, setInitialOdds] = useState(defaultInitial ?? 5.0);
  const [layOdds, setLayOdds] = useState(defaultLay ?? 3.5);
  const [bankroll, setBankroll] = useState(settings.bankroll);
  const [multiplier, setMultiplier] = useState(settings.kellyMultiplier);
  const [maxLiab, setMaxLiab] = useState(settings.maxLiabilityPct);

  const trueProb = impliedProbability(initialOdds);
  const result = kellyLayStake({
    bankroll,
    trueProb,
    currentLayOdds: layOdds,
    kellyMultiplier: multiplier,
    maxLiabilityPct: maxLiab,
  });

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        Kelly Criterion Calculator (Lay)
      </h3>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">
            Initial Odds
          </label>
          <input
            type="number"
            value={initialOdds}
            onChange={(e) => setInitialOdds(parseFloat(e.target.value) || 1.01)}
            className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            min={1.01}
            step={0.1}
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">
            Current Lay Odds
          </label>
          <input
            type="number"
            value={layOdds}
            onChange={(e) => setLayOdds(parseFloat(e.target.value) || 1.01)}
            className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            min={1.01}
            step={0.1}
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">
            Bankroll (£)
          </label>
          <input
            type="number"
            value={bankroll}
            onChange={(e) => setBankroll(parseFloat(e.target.value) || 0)}
            className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            min={0}
            step={100}
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">
            Kelly Multiplier
          </label>
          <input
            type="number"
            value={multiplier}
            onChange={(e) => setMultiplier(parseFloat(e.target.value) || 0)}
            className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            min={0}
            max={2}
            step={0.1}
          />
        </div>
        <div className="col-span-2">
          <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">
            Max Liability (% of bankroll)
          </label>
          <input
            type="number"
            value={maxLiab}
            onChange={(e) => setMaxLiab(parseFloat(e.target.value) || 0)}
            className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            min={0}
            max={10}
            step={0.1}
          />
        </div>
      </div>

      {/* Results */}
      <div className="bg-gray-50 rounded p-3 space-y-2">
        <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">
          Results
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-gray-500">True Win Prob:</span>
            <span className="ml-1 font-mono font-semibold">
              {(trueProb * 100).toFixed(1)}%
            </span>
          </div>
          <div>
            <span className="text-gray-500">Kelly Fraction:</span>
            <span className="ml-1 font-mono font-semibold">
              {(result.kellyFraction * 100).toFixed(2)}%
            </span>
          </div>
          <div>
            <span className="text-gray-500">Lay Stake:</span>
            <span className="ml-1 font-mono font-bold text-blue-600">
              £{result.layStake.toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Liability:</span>
            <span className="ml-1 font-mono font-bold text-red-600">
              £{result.liability.toFixed(2)}
            </span>
            {result.cappedByMaxLiability && (
              <span className="ml-1 text-[10px] text-amber-500">(capped)</span>
            )}
          </div>
          <div>
            <span className="text-gray-500">Profit if loses:</span>
            <span className="ml-1 font-mono text-green-600">
              +£{result.profitIfLoses.toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Loss if wins:</span>
            <span className="ml-1 font-mono text-red-600">
              -£{result.lossIfWins.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
