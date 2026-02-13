import { UserSettings } from './types';

// Refresh interval: 60 seconds
export const REFRESH_INTERVAL_MS = 60_000;

// Default user settings
export const DEFAULT_SETTINGS: UserSettings = {
  bankroll: 1000,
  currency: 'GBP',
  thresholds: {
    conservative: 15,
    strong: 25,
    premium: 40,
  },
  kellyMode: 'half',
  kellyMultiplier: 0.5,
  maxLiabilityPct: 5,
  fieldSizeMin: 2,
  fieldSizeMax: 30,
  commission: 0.05,       // Betfair 5% commission
  minStake: 2,            // Betfair minimum £2 stake
  modelAlpha: 1.0,        // Calibration alpha (1.0 = raw implied prob)
  modelBeta: 1.0,         // Calibration beta (1.0 = no adjustment)
};

// Compression colour thresholds (maps to tailwind classes)
export const COMPRESSION_COLORS = {
  conservative: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    badge: 'bg-green-100 text-green-800',
  },
  strong: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-800',
  },
  premium: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    badge: 'bg-red-100 text-red-800',
  },
  none: {
    bg: '',
    text: 'text-gray-600',
    border: 'border-gray-100',
    badge: '',
  },
} as const;

// Currency symbols
export const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: '£',
  EUR: '€',
  USD: '$',
};
