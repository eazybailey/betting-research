import { UserSettings } from './types';

// The Odds API configuration
export const ODDS_API_BASE_URL = 'https://api.the-odds-api.com/v4';

// Default sport key — horse racing keys vary by region on The Odds API.
// The /v4/sports endpoint will be used to discover the actual key at runtime.
export const DEFAULT_SPORT_KEY = 'horse_racing';
export const DEFAULT_REGION = 'uk';
export const DEFAULT_MARKETS = 'h2h';
export const DEFAULT_ODDS_FORMAT = 'decimal';

// Refresh interval: 60 seconds
export const REFRESH_INTERVAL_MS = 60_000;

// Available sport options for the dashboard selector.
// The Odds API uses these keys. 'auto_horse_racing' is our special key
// that triggers the horse-racing discovery logic.
export const SPORT_OPTIONS = [
  { key: 'auto_horse_racing', label: 'Horse Racing (auto-detect)', group: 'Racing' },
  { key: 'soccer_epl', label: 'Soccer — EPL', group: 'Soccer' },
  { key: 'soccer_fa_cup', label: 'Soccer — FA Cup', group: 'Soccer' },
  { key: 'soccer_uefa_champs_league', label: 'Soccer — Champions League', group: 'Soccer' },
  { key: 'basketball_nba', label: 'Basketball — NBA', group: 'Basketball' },
  { key: 'americanfootball_nfl', label: 'American Football — NFL', group: 'American Football' },
  { key: 'icehockey_nhl', label: 'Ice Hockey — NHL', group: 'Ice Hockey' },
  { key: 'tennis_atp_french_open', label: 'Tennis — ATP', group: 'Tennis' },
  { key: 'mma_mixed_martial_arts', label: 'MMA', group: 'Combat' },
  { key: 'boxing_boxing', label: 'Boxing', group: 'Combat' },
  { key: 'rugbyleague_nrl', label: 'Rugby League — NRL', group: 'Rugby' },
] as const;

// Region options
export const REGION_OPTIONS = [
  { key: 'uk', label: 'UK' },
  { key: 'us', label: 'US' },
  { key: 'eu', label: 'EU' },
  { key: 'au', label: 'AU' },
] as const;

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
  maxLiabilityPct: 1.5,
  fieldSizeMin: 8,
  fieldSizeMax: 14,
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
