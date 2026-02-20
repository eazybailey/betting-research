// ============================================================
// Core TypeScript interfaces for the Racing Value Detection Platform
// ============================================================

// --- Common event format (Racing API transforms into this) ---

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
  /** Betfair Exchange price — the price we actually lay at */
  betfairOdds: number | null;
  /** Best (lowest) current odds across ALL bookmakers */
  bestCurrentOdds: number | null;
  bestBookmaker: string | null;
  worstBookmaker: string | null;
  /** Opening average across all bookmakers (from DB first snapshot, or current avg as proxy) */
  openingAverageOdds: number | null;
  /** Legacy field — same as openingAverageOdds for backward compat */
  initialOdds: number | null;
  hasDbOpening: boolean;
  /** Current average across all bookmakers (live market consensus) */
  averageOdds: number | null;
  /** Number of bookmakers with real odds for this runner */
  bookmakerCount: number;
  /** Odds spread: [lowest, highest] across bookmakers */
  oddsSpread: [number, number] | null;
  impliedProbability: number | null;
  currentImpliedProbability: number | null;
  /** Compression: betfairOdds vs openingAverageOdds */
  compressionPercent: number | null;
  valueSignal: ValueSignalLevel;
  /** Full lay decision from the lay engine */
  layDecision: import('./lay-engine').LayDecision | null;
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
  /** Race result: winner name and positions (null if race hasn't run yet) */
  result: RaceResult | null;
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
  /** Exchange commission rate (e.g. 0.05 for Betfair 5%) */
  commission: number;
  /** Minimum exchange stake in currency */
  minStake: number;
  /** Probability model calibration: P(win) = 1/(1 + alpha*(O-1)^beta) */
  modelAlpha: number;
  modelBeta: number;
}

// --- Kelly Calculator types (legacy — use LayDecision from lay-engine.ts) ---

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
  sp?: string;
  sp_dec?: string;
  // Bookmaker odds (Standard plan) — array of entries
  odds?: Array<{ bookmaker: string; fractional: string; decimal: string; ew_places: string; ew_denom: string; updated: string }>;
  // Allow indexing for dynamic field access
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
  field_size: string;
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

// --- Racing API results types ---

export interface RacingApiResultRunner {
  horse_id: string;
  horse: string;
  position: string;
  sp: string;
  sp_dec: string;
  number: number;
  draw: number;
  btn: string;
  over_btn: string;
  age: string;
  sex: string;
  weight: string;
  weight_lbs: string;
  headgear: string;
  time: string;
  prize: string;
  jockey: string;
  jockey_id: string;
  trainer: string;
  trainer_id: string;
  owner: string;
  owner_id: string;
  or: string;
  sire: string;
  sire_id: string;
  dam: string;
  dam_id: string;
  damsire: string;
  damsire_id: string;
  [key: string]: unknown;
}

export interface RacingApiResult {
  race_id: string;
  course: string;
  course_id: string;
  date: string;
  off_time: string;
  off_dt?: string;
  race_name: string;
  distance_round: string;
  distance: string;
  distance_f: string;
  region: string;
  pattern: string;
  race_class: string;
  type: string;
  going: string;
  runners: RacingApiResultRunner[];
}

/** Simplified result for a single race: winner + positions */
export interface RaceResult {
  /** Winner horse name (position "1") */
  winner: string | null;
  /** All runner positions: horse name → finishing position */
  positions: Map<string, string>;
  /** Whether result data was found for this race */
  hasResult: boolean;
}

// --- API response wrapper ---

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  meta?: {
    url: string;
    status: number;
  };
}

export interface DashboardStats {
  racesToday: number;
  racesTomorrow: number;
  valueAlerts: number;
  snapshotsSaved: number;
  supabaseConnected: boolean;
  openingOddsCount: number;
  lastRefreshed: string | null;
}
