'use client';

import { formatOdds, formatPercent } from '@/lib/calculations';

interface OddsCellProps {
  odds: number | null;
  impliedPct: number | null;
  label?: string;
  muted?: boolean;
}

export default function OddsCell({ odds, impliedPct, label, muted }: OddsCellProps) {
  const textColor = muted ? 'text-gray-400' : 'text-gray-900';

  return (
    <div className="text-center">
      {label && (
        <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">
          {label}
        </div>
      )}
      <div className={`text-sm font-mono font-semibold ${textColor}`}>
        {formatOdds(odds)}
      </div>
      {impliedPct !== null && (
        <div className="text-[10px] text-gray-400">
          {formatPercent(impliedPct)}
        </div>
      )}
    </div>
  );
}
