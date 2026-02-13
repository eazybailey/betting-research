/**
 * Lay Betting Engine for Horse Racing (Exchange Markets)
 *
 * Implements correct exchange lay-betting math:
 * - Full Kelly criterion for LAY bets (fraction of bankroll risked as liability)
 * - Commission-adjusted payoffs (Betfair-style)
 * - Expected Value (EV) calculation
 * - Calibrated probability model (betting equation)
 * - Proper edge detection for lay betting
 *
 * When we LAY a horse:
 * - We WIN stake S (minus commission) if the horse LOSES
 * - We LOSE liability L = S*(O-1) if the horse WINS
 */

// ============================================================
// Probability Model
// ============================================================

export interface ModelParams {
  /** Logistic calibration alpha (default 1.0 = no calibration) */
  alpha: number;
  /** Logistic calibration beta (default 1.0 = no calibration) */
  beta: number;
}

/**
 * Calibrated probability model using the "betting equation" logistic form.
 *
 * P(win) = 1 / (1 + alpha * (O - 1)^beta)
 *
 * When alpha=1, beta=1: P(win) = 1/O (raw implied probability)
 * These parameters should be fitted from historical data per market segment.
 *
 * @param decimalOdds - Decimal odds O (must be > 1)
 * @param params - Calibration parameters { alpha, beta }
 * @returns Estimated probability of horse winning
 */
export function modelProbability(
  decimalOdds: number,
  params: ModelParams = { alpha: 1, beta: 1 }
): number {
  if (decimalOdds <= 1) return 1;
  const x = decimalOdds - 1; // fractional odds
  return 1 / (1 + params.alpha * Math.pow(x, params.beta));
}

// ============================================================
// Core Lay Betting Math
// ============================================================

export interface LayBetParams {
  /** Decimal lay odds O (must be > 1) */
  layOdds: number;
  /** Model probability that the horse WINS */
  pWin: number;
  /** Lay stake S */
  stake: number;
  /** Commission rate (e.g. 0.05 for 5%) */
  commission: number;
}

/**
 * Calculate lay bet liability.
 * L = S * (O - 1)
 */
export function layLiability(stake: number, layOdds: number): number {
  return stake * (layOdds - 1);
}

/**
 * Calculate profit if the horse LOSES (we win).
 * Net of commission: profit = S * (1 - c)
 */
export function profitIfLose(stake: number, commission: number): number {
  return stake * (1 - commission);
}

/**
 * Calculate loss if the horse WINS (we lose).
 * Loss = L = S * (O - 1)
 */
export function lossIfWin(stake: number, layOdds: number): number {
  return layLiability(stake, layOdds);
}

/**
 * Calculate Expected Value of a lay bet.
 *
 * EV = q * S * (1-c) - p * L
 *    = q * S * (1-c) - p * S * (O-1)
 *
 * Where: p = P(win), q = 1-p = P(lose)
 */
export function layEV(params: LayBetParams): number {
  const { layOdds, pWin, stake, commission } = params;
  const pLose = 1 - pWin;
  const L = layLiability(stake, layOdds);
  return pLose * stake * (1 - commission) - pWin * L;
}

/**
 * Market-implied win probability from decimal odds.
 * p_market = 1 / O
 */
export function marketImpliedProb(decimalOdds: number): number {
  if (decimalOdds <= 0) return 0;
  return 1 / decimalOdds;
}

// ============================================================
// Full Kelly Criterion for LAY Bets
// ============================================================

export interface FullKellyParams {
  /** Total bankroll */
  bankroll: number;
  /** Decimal lay odds O */
  layOdds: number;
  /** Model probability horse WINS */
  pWin: number;
  /** Commission rate (e.g. 0.05 for Betfair) */
  commission: number;
  /** Kelly multiplier (1.0 = full, 0.5 = half) */
  kellyMultiplier: number;
  /** Max liability as % of bankroll (e.g. 5 = 5%) */
  maxLiabilityPct: number;
  /** Minimum stake (exchange minimum) */
  minStake: number;
}

export interface FullKellyResult {
  /** Optimal fraction of bankroll to risk as liability */
  kellyFraction: number;
  /** Return per unit liability when horse loses: r = (1-c)/(O-1) */
  returnPerLiability: number;
  /** Lay stake (amount we win if horse loses, before commission) */
  layStake: number;
  /** Liability = stake * (O-1) */
  liability: number;
  /** Net profit if horse loses: S*(1-c) */
  profitIfLoses: number;
  /** Loss if horse wins: L */
  lossIfWins: number;
  /** Expected value in currency */
  ev: number;
  /** EV as percentage of bankroll */
  evPctBankroll: number;
  /** EV per unit liability */
  evPerLiability: number;
  /** Whether liability was capped */
  cappedByMaxLiability: boolean;
  /** Whether stake was floored to minimum */
  belowMinStake: boolean;
}

/**
 * Full Kelly sizing for LAY bets.
 *
 * We choose Kelly based on fraction of bankroll allocated to LIABILITY.
 *
 * f = fraction of bankroll risked as liability
 * L = f * B (liability)
 * S = L / (O-1) = f*B / (O-1) (stake)
 *
 * Return per unit liability: r = (1-c) / (O-1)
 *
 * Bankroll transitions:
 *   Horse loses (prob q): B' = B * (1 + f*r)
 *   Horse wins  (prob p): B' = B * (1 - f)
 *
 * Kelly optimal: maximize G(f) = q*ln(1+f*r) + p*ln(1-f)
 *
 * Closed-form solution:
 *   f* = q - p/r = q - p*(O-1)/(1-c)
 *
 * Constraints:
 *   f* <= 0: no bet (negative edge)
 *   f* > 1: cap at 1 (no leverage by default)
 */
export function kellyLay(params: FullKellyParams): FullKellyResult {
  const {
    bankroll,
    layOdds,
    pWin,
    commission,
    kellyMultiplier,
    maxLiabilityPct,
    minStake,
  } = params;

  const pLose = 1 - pWin;
  const oddsMinusOne = layOdds - 1;

  // Return per unit liability when horse loses
  const r = oddsMinusOne > 0 ? (1 - commission) / oddsMinusOne : 0;

  // Full Kelly fraction: f* = q - p*(O-1)/(1-c) = q - p/r
  const kellyFraction = r > 0 ? pLose - (pWin * oddsMinusOne) / (1 - commission) : 0;

  // No positive edge → don't bet
  if (kellyFraction <= 0 || oddsMinusOne <= 0 || bankroll <= 0) {
    return {
      kellyFraction: Math.max(kellyFraction, 0),
      returnPerLiability: r,
      layStake: 0,
      liability: 0,
      profitIfLoses: 0,
      lossIfWins: 0,
      ev: 0,
      evPctBankroll: 0,
      evPerLiability: 0,
      cappedByMaxLiability: false,
      belowMinStake: false,
    };
  }

  // Apply Kelly multiplier (e.g. 0.5 for half Kelly, 1.0 for full)
  // Cap at 1 (no leverage)
  const adjustedF = Math.min(kellyFraction * kellyMultiplier, 1);

  // Calculate liability and stake
  let liab = adjustedF * bankroll;
  let stake = liab / oddsMinusOne;
  let cappedByMaxLiability = false;
  let belowMinStake = false;

  // Cap liability at maxLiabilityPct of bankroll
  const maxLiab = bankroll * (maxLiabilityPct / 100);
  if (liab > maxLiab) {
    liab = maxLiab;
    stake = liab / oddsMinusOne;
    cappedByMaxLiability = true;
  }

  // Check minimum stake
  if (stake < minStake && stake > 0) {
    belowMinStake = true;
    // Don't force up to minStake — just flag it
  }

  // Payoffs
  const profit = profitIfLose(stake, commission);
  const loss = lossIfWin(stake, layOdds);

  // Expected value
  const ev = pLose * profit - pWin * loss;
  const evPctBankroll = bankroll > 0 ? (ev / bankroll) * 100 : 0;
  const evPerLiability = liab > 0 ? ev / liab : 0;

  return {
    kellyFraction: round4(kellyFraction),
    returnPerLiability: round4(r),
    layStake: round2(stake),
    liability: round2(liab),
    profitIfLoses: round2(profit),
    lossIfWins: round2(loss),
    ev: round2(ev),
    evPctBankroll: round4(evPctBankroll),
    evPerLiability: round4(evPerLiability),
    cappedByMaxLiability,
    belowMinStake,
  };
}

// ============================================================
// Lay Decision Engine (Full Output Contract)
// ============================================================

export interface LayDecisionInput {
  eventId: string;
  runnerName: string;
  initialOdds: number | null;
  currentOdds: number | null;
  averageOdds: number | null;
  bankroll: number;
  commission: number;
  kellyMultiplier: number;
  maxLiabilityPct: number;
  minStake: number;
  modelParams: ModelParams;
}

export interface LayDecision {
  // --- Model ---
  /** Our model's estimated P(win) */
  pModel: number | null;
  /** Market-implied P(win) from current odds: 1/O */
  pMarket: number | null;
  /** Edge: pMarket - pModel (positive = we think horse is overpriced) */
  edge: number | null;

  // --- Filter flags ---
  /** CurrentOdds < InitialOdds (price has shortened) */
  priceShortened: boolean;
  /** pModel < pMarket (value condition for laying) */
  hasLayValue: boolean;
  /** All conditions met to place lay */
  placeLay: boolean;
  /** Reason codes for decision */
  reasons: string[];

  // --- Kelly ---
  kelly: FullKellyResult | null;

  // --- EV ---
  ev: number | null;
  evPctBankroll: number | null;
}

/**
 * Evaluate a runner for a lay bet.
 * Full output contract per the spec.
 */
export function evaluateRunner(input: LayDecisionInput): LayDecision {
  const {
    initialOdds,
    currentOdds,
    averageOdds,
    bankroll,
    commission,
    kellyMultiplier,
    maxLiabilityPct,
    minStake,
    modelParams,
  } = input;

  const reasons: string[] = [];

  // Can't evaluate without current odds
  if (currentOdds === null || currentOdds <= 1) {
    return nullDecision(['No current odds available']);
  }

  // Model probability: use average odds (consensus) for best estimate,
  // falling back to current odds
  const oddsForModel = averageOdds ?? currentOdds;
  const pModel = modelProbability(oddsForModel, modelParams);
  const pMarket = marketImpliedProb(currentOdds);
  const edge = pMarket - pModel;

  // Filter 1: Price has shortened (currentOdds < initialOdds)
  const priceShortened =
    initialOdds !== null && currentOdds < initialOdds;

  // Filter 2: Value condition — our model says horse is LESS likely to win
  // than the market implies (p_model < p_market). This means the market
  // has overpriced the horse → good to lay.
  const hasLayValue = pModel < pMarket;

  // Decision
  if (!priceShortened) {
    reasons.push('Price not shortened');
  }
  if (!hasLayValue) {
    reasons.push('No lay value (model p >= market p)');
  }

  const placeLay = priceShortened && hasLayValue;

  if (!placeLay) {
    return {
      pModel,
      pMarket,
      edge,
      priceShortened,
      hasLayValue,
      placeLay: false,
      reasons,
      kelly: null,
      ev: null,
      evPctBankroll: null,
    };
  }

  // Run Full Kelly
  const kelly = kellyLay({
    bankroll,
    layOdds: currentOdds,
    pWin: pModel,
    commission,
    kellyMultiplier,
    maxLiabilityPct,
    minStake,
  });

  if (kelly.kellyFraction <= 0) {
    reasons.push('Kelly fraction <= 0 (negative EV after commission)');
    return {
      pModel,
      pMarket,
      edge,
      priceShortened,
      hasLayValue,
      placeLay: false,
      reasons,
      kelly,
      ev: kelly.ev,
      evPctBankroll: kelly.evPctBankroll,
    };
  }

  if (kelly.belowMinStake) {
    reasons.push(`Stake £${kelly.layStake} below min £${minStake}`);
  }

  reasons.push('PLACE LAY');

  return {
    pModel,
    pMarket,
    edge,
    priceShortened,
    hasLayValue,
    placeLay: true,
    reasons,
    kelly,
    ev: kelly.ev,
    evPctBankroll: kelly.evPctBankroll,
  };
}

// ============================================================
// Break-even + Sanity Checks
// ============================================================

/**
 * Break-even probability for a lay bet.
 * EV = 0 when: p_break = q*(1-c) / (O-1 + (1-c))
 *            = (1-p)*(1-c) / (O-1 + (1-c))
 * Rearranging: p_break = (1-c) / (O - c)
 */
export function breakEvenProb(layOdds: number, commission: number): number {
  if (layOdds <= 1) return 1;
  return (1 - commission) / (layOdds - commission);
}

// ============================================================
// Helpers
// ============================================================

function nullDecision(reasons: string[]): LayDecision {
  return {
    pModel: null,
    pMarket: null,
    edge: null,
    priceShortened: false,
    hasLayValue: false,
    placeLay: false,
    reasons,
    kelly: null,
    ev: null,
    evPctBankroll: null,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
