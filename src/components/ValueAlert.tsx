'use client';

import { ValueSignalLevel } from '@/lib/types';
import { COMPRESSION_COLORS } from '@/lib/constants';

interface ValueAlertProps {
  signal: ValueSignalLevel;
}

const SIGNAL_LABELS: Record<ValueSignalLevel, string> = {
  none: '',
  conservative: 'Conservative',
  strong: 'Strong',
  premium: 'Premium',
};

export default function ValueAlert({ signal }: ValueAlertProps) {
  if (signal === 'none') return null;

  const colors = COMPRESSION_COLORS[signal];

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${colors.badge}`}
    >
      {SIGNAL_LABELS[signal]}
    </span>
  );
}
