import { Thresholds, ValueSignalLevel, KellyParams, KellyResult } from './types';

/**
 * Convert decimal odds to implied probability.
 *
 * Example: odds of 3.0 → 1/3.0 = 0.3333 (33.33%)
 */
export function impliedProbability(decimalOdds: number): number {
  if (decimalOdds <= 0) return 0;
  return 1 / decimalOdds;
}

/**
 * Calculate price compression percentage.
 *
 * Measures how much the odds have shortened from the initial price.
 * Positive = odds shortened (horse is being backed / our signal).
 * Negative = odds drifted (no signal).
 *
 * Formula: ((initialOdds - currentOdds) / initialOdds) × 100
 *
 * Example: initial 5.0, current 3.5 → ((5.0 - 3.5) / 5.0) × 100 = 30%
 */
export function priceCompression(initialOdds: number, currentOdds: number): number {
  if (initialOdds <= 0) return 0;
  return ((initialOdds - currentOdds) / initialOdds) * 100;
}

/**
 * Determine value signal level based on compression percentage
 * against configurable thresholds.
 *
 * Only positive compression (odds shortened) triggers a signal.
 */
export function valueSignal(
  compression: number,
  thresholds: Thresholds
): ValueSignalLevel {
  if (compression >= thresholds.premium) return 'premium';
  if (compression >= thresholds.strong) return 'strong';
  if (compression >= thresholds.conservative) return 'conservative';
  return 'none';
}

/**
 * Kelly Criterion for lay betting.
 *
 * When we lay a horse, we are betting it will LOSE.
 *
 * Key variables:
 * - p = probability the horse LOSES = 1 - (1 / initialOdds)
 * - q = probability the horse WINS = 1 / initialOdds
 * - b = net odds to 1 from the lay perspective = 1 / (layOdds - 1)
 *       (because if the horse loses, we win the backer's stake;
 *        if the horse wins, we lose (layOdds - 1) × stake)
 *
 * Kelly fraction for lay betting:
 *   f = p / (layOdds - 1) - q
 *
 * This simplifies from the standard Kelly: f = (bp - q) / b
 * where b = 1/(layOdds - 1), giving:
 *   f = (p / (layOdds - 1) - q × (layOdds - 1)) / 1
 *
 * Actually, the correct Kelly for a lay bet:
 *   f = (p × (layOdds - 1) - q) / (layOdds - 1)
 *   where p = prob horse loses, q = prob horse wins
 *
 * Liability = layStake × (layOdds - 1)
 * Profit if horse loses = layStake (we keep the backer's stake)
 * Loss if horse wins = layStake × (layOdds - 1) = liability
 */
export function kellyLayStake(params: KellyParams): KellyResult {
  const {
    bankroll,
    trueProb,
    currentLayOdds,
    kellyMultiplier,
    maxLiabilityPct,
  } = params;

  // trueProb here is the probability the horse WINS (from initial odds: 1/initialOdds)
  const probWin = trueProb;
  const probLose = 1 - probWin;

  // Kelly fraction for lay betting:
  // f = (probLose × (layOdds - 1) - probWin) / (layOdds - 1)
  const layOddsMinusOne = currentLayOdds - 1;

  if (layOddsMinusOne <= 0) {
    return {
      layStake: 0,
      liability: 0,
      profitIfLoses: 0,
      lossIfWins: 0,
      kellyFraction: 0,
      cappedByMaxLiability: false,
    };
  }

  const kellyFraction = (probLose * layOddsMinusOne - probWin) / layOddsMinusOne;

  // If Kelly is negative, the bet has negative expected value — don't bet
  if (kellyFraction <= 0) {
    return {
      layStake: 0,
      liability: 0,
      profitIfLoses: 0,
      lossIfWins: 0,
      kellyFraction,
      cappedByMaxLiability: false,
    };
  }

  // Apply Kelly multiplier (e.g., 0.5 for half Kelly)
  const adjustedFraction = kellyFraction * kellyMultiplier;

  // Calculate lay stake as fraction of bankroll
  let layStake = bankroll * adjustedFraction;
  let liability = layStake * layOddsMinusOne;

  // Cap liability at maxLiabilityPct of bankroll
  const maxLiability = bankroll * (maxLiabilityPct / 100);
  let cappedByMaxLiability = false;

  if (liability > maxLiability) {
    liability = maxLiability;
    layStake = liability / layOddsMinusOne;
    cappedByMaxLiability = true;
  }

  return {
    layStake: Math.round(layStake * 100) / 100,
    liability: Math.round(liability * 100) / 100,
    profitIfLoses: Math.round(layStake * 100) / 100,
    lossIfWins: Math.round(liability * 100) / 100,
    kellyFraction: Math.round(kellyFraction * 10000) / 10000,
    cappedByMaxLiability,
  };
}

/**
 * Calculate market overround / book percentage.
 *
 * Sum of implied probabilities for all runners.
 * - 100% = perfectly fair book
 * - >100% = bookmaker margin built in (typical)
 * - <100% = unlikely but would indicate value exists
 */
export function bookPercentage(allRunnerOdds: number[]): number {
  if (allRunnerOdds.length === 0) return 0;
  const validOdds = allRunnerOdds.filter((o) => o > 0);
  if (validOdds.length === 0) return 0;
  return validOdds.reduce((sum, odds) => sum + impliedProbability(odds), 0) * 100;
}

/**
 * Format a number as a percentage string.
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format decimal odds for display.
 */
export function formatOdds(odds: number | null): string {
  if (odds === null || odds <= 0) return '-';
  return odds.toFixed(2);
}
