// ============================================================
// Core TypeScript interfaces for the Odds Aggregation Platform
// ============================================================

// --- The Odds API response types ---

export interface OddsApiSport {
  key: string;
  group: string;
  title: string;
  description: string;
  active: boolean;
  has_outrights: boolean;
}

export interface OddsApiOutcome {
  name: string;
  price: number;
}

export interface OddsApiMarket {
  key: string;
  last_update: string;
  outcomes: OddsApiOutcome[];
}

export interface OddsApiBookmaker {
  key: string;
  title: string;
  last_update: string;
  markets: OddsApiMarket[];
}

export interface OddsApiEvent {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string | null;
  away_team: string | null;
  bookmakers: OddsApiBookmaker[];
}

// --- Application domain types ---

export interface RunnerOdds {
  runnerName: string;
  bookmakerOdds: BookmakerPrice[];
  bestCurrentOdds: number | null;
  bestBookmaker: string | null;
  initialOdds: number | null;
  impliedProbability: number | null;
  currentImpliedProbability: number | null;
  compressionPercent: number | null;
  valueSignal: ValueSignalLevel;
}

export interface BookmakerPrice {
  bookmaker: string;
  bookmakerTitle: string;
  price: number;
  lastUpdate: string;
}

export type ValueSignalLevel = 'none' | 'conservative' | 'strong' | 'premium';

export interface Race {
  eventId: string;
  eventName: string;
  sportKey: string;
  commenceTime: string;
  runnerCount: number;
  runners: RunnerOdds[];
  bookPercentage: number | null;
  withinFieldSizeFilter: boolean;
}

export interface OddsSnapshot {
  id?: string;
  event_id: string;
  event_name: string;
  sport_key: string;
  commence_time: string;
  snapshot_time?: string;
  bookmaker: string;
  runner_name: string;
  back_price: number | null;
  lay_price: number | null;
  is_opening: boolean;
  created_at?: string;
}

// --- Settings types ---

export interface Thresholds {
  conservative: number;
  strong: number;
  premium: number;
}

export interface UserSettings {
  bankroll: number;
  currency: string;
  thresholds: Thresholds;
  kellyMode: 'full' | 'half' | 'custom';
  kellyMultiplier: number;
  maxLiabilityPct: number;
  fieldSizeMin: number;
  fieldSizeMax: number;
}

// --- Kelly Calculator types ---

export interface KellyParams {
  bankroll: number;
  trueProb: number;
  currentLayOdds: number;
  kellyMultiplier: number;
  maxLiabilityPct: number;
}

export interface KellyResult {
  layStake: number;
  liability: number;
  profitIfLoses: number;
  lossIfWins: number;
  kellyFraction: number;
  cappedByMaxLiability: boolean;
}

// --- The Racing API response types ---

export interface RacingApiRunner {
  horse_id: string;
  horse: string;
  number: number;
  draw: number;
  age: string;
  sex: string;
  sex_code: string;
  colour: string;
  region: string;
  form: string;
  lbs: string;
  ofr: string;
  rpr: string;
  ts: string;
  jockey: string;
  jockey_id: string;
  trainer: string;
  trainer_id: string;
  trainer_location: string;
  owner: string;
  owner_id: string;
  silk_url: string;
  sire: string;
  sire_id: string;
  dam: string;
  dam_id: string;
  damsire: string;
  damsire_id: string;
  headgear: string;
  headgear_run: string;
  comment: string;
  spotlight: string;
  last_run: string;
  // SP fields (available in results / post-race)
  sp?: string;
  sp_dec?: string;
  // Bookmaker odds (Standard plan) — exact field name TBD
  // May be keyed by bookmaker name → decimal price, or array of entries
  odds?: Record<string, number>;
  prices?: Record<string, number> | Array<{ bookmaker: string; price: number }>;
  bookmaker_odds?: Record<string, number>;
  bookmakers?: Record<string, number> | Array<{ bookmaker: string; price: number }>;
  // Allow indexing for dynamic odds field detection
  [key: string]: unknown;
}

export interface RacingApiRacecard {
  race_id: string;
  course: string;
  course_id: string;
  date: string;
  off_time: string;
  off_dt: string;
  race_name: string;
  distance_round: string;
  distance: string;
  distance_f: string;
  region: string;
  pattern: string;
  race_class: string;
  type: string;
  age_band: string;
  rating_band: string;
  prize: string;
  field_size: string; // API returns string, not number
  going_detailed: string;
  going: string;
  surface: string;
  race_status: string;
  is_abandoned: boolean;
  big_race: boolean;
  runners: RacingApiRunner[];
}

export interface RacingApiResponse {
  racecards: RacingApiRacecard[];
}

// --- API response wrapper ---

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  apiUsage?: {
    requestsRemaining: number | null;
    requestsUsed: number | null;
  };
  meta?: {
    url: string;
    status: number;
  };
}

export interface DashboardStats {
  racesToday: number;
  valueAlerts: number;
  requestsRemaining: number | null;
  requestsUsed: number | null;
  lastRefreshed: string | null;
}
