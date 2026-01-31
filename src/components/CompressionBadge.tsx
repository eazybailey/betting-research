'use client';

import { ValueSignalLevel } from '@/lib/types';
import { COMPRESSION_COLORS } from '@/lib/constants';
import { formatPercent } from '@/lib/calculations';

interface CompressionBadgeProps {
  compressionPercent: number | null;
  signal: ValueSignalLevel;
}

export default function CompressionBadge({
  compressionPercent,
  signal,
}: CompressionBadgeProps) {
  if (compressionPercent === null) {
    return <span className="text-xs text-gray-400">-</span>;
  }

  const isNegative = compressionPercent < 0;
  const colors = COMPRESSION_COLORS[signal];

  if (signal === 'none') {
    return (
      <span className={`text-xs font-mono ${isNegative ? 'text-gray-400' : 'text-gray-500'}`}>
        {isNegative ? '' : '+'}
        {formatPercent(compressionPercent)}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${colors.badge}`}
    >
      +{formatPercent(compressionPercent)}
    </span>
  );
}
