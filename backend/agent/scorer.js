/**
 * scorer.js
 * Scoring algorithm that converts wallet analysis data into a credit score (300–850).
 *
 * Weights:
 *   Account Age        20%
 *   Transaction Volume 20%
 *   Consistency        20%
 *   Token Diversity    15%
 *   Balance Stability  15%
 *   Error Rate         10%
 */

/**
 * Score account age (0–100)
 * <3mo=0, 3-12mo=50, 1-2yr=75, 2yr+=100
 */
function scoreAccountAge(ageMonths) {
  if (ageMonths < 3) return 0;
  if (ageMonths < 12) return 50;
  if (ageMonths < 24) return 75;
  return 100;
}

/**
 * Score transaction volume (0–100)
 * Based on total transaction count
 */
function scoreTransactionVolume(txCount) {
  if (txCount === 0) return 0;
  if (txCount < 10) return 20;
  if (txCount < 50) return 40;
  if (txCount < 200) return 60;
  if (txCount < 500) return 80;
  return 100;
}

/**
 * Score consistency (0–100)
 * Penalizes large dormant gaps
 */
function scoreConsistency(consistency, txCount) {
  if (txCount === 0) return 0;
  const { gapCount, maxGapDays } = consistency;

  let score = 100;

  // Penalize each gap > 30 days
  score -= gapCount * 10;

  // Penalize very long single gaps
  if (maxGapDays > 180) score -= 20;
  else if (maxGapDays > 90) score -= 10;

  return Math.max(0, Math.min(100, score));
}

/**
 * Score token diversity (0–100)
 * More HTS tokens held = better financial activity breadth
 */
function scoreTokenDiversity(tokenCount) {
  if (tokenCount === 0) return 10;
  if (tokenCount < 3) return 30;
  if (tokenCount < 6) return 55;
  if (tokenCount < 10) return 75;
  if (tokenCount < 20) return 90;
  return 100;
}

/**
 * Score balance stability (0–100)
 * Based on HBAR balance — higher balance indicates stability
 */
function scoreBalanceStability(hbarBalance) {
  if (hbarBalance < 1) return 10;
  if (hbarBalance < 10) return 30;
  if (hbarBalance < 100) return 55;
  if (hbarBalance < 1000) return 75;
  if (hbarBalance < 10000) return 90;
  return 100;
}

/**
 * Score error rate (0–100)
 * Lower error rate = higher score
 */
function scoreErrorRate(errorStats) {
  const { errorRate } = errorStats;
  if (errorRate === 0) return 100;
  if (errorRate < 0.02) return 90;
  if (errorRate < 0.05) return 75;
  if (errorRate < 0.10) return 55;
  if (errorRate < 0.20) return 30;
  return 10;
}

/**
 * Maps a 0–100 raw score to the 300–850 FICO-like range
 */
function mapToFICORange(rawScore) {
  return Math.round(300 + (rawScore / 100) * 550);
}

/**
 * Main scoring function
 * Returns a complete score report
 */
function calculateScore(analysisData) {
  const {
    accountId,
    ageMonths,
    transactionCount,
    consistency,
    errorStats,
    tokenCount,
    hbarBalance,
  } = analysisData;

  const breakdown = {
    accountAge: {
      rawScore: scoreAccountAge(ageMonths),
      weight: 0.20,
      label: 'Account Age',
      detail: `${ageMonths} months old`,
    },
    transactionVolume: {
      rawScore: scoreTransactionVolume(transactionCount),
      weight: 0.20,
      label: 'Transaction Volume',
      detail: `${transactionCount} transactions`,
    },
    consistency: {
      rawScore: scoreConsistency(consistency, transactionCount),
      weight: 0.20,
      label: 'Activity Consistency',
      detail: `${consistency.gapCount} dormant gap(s), max ${consistency.maxGapDays} days`,
    },
    tokenDiversity: {
      rawScore: scoreTokenDiversity(tokenCount),
      weight: 0.15,
      label: 'Token Diversity',
      detail: `${tokenCount} HTS token(s) held`,
    },
    balanceStability: {
      rawScore: scoreBalanceStability(hbarBalance),
      weight: 0.15,
      label: 'Balance Stability',
      detail: `${hbarBalance.toFixed(4)} HBAR balance`,
    },
    errorRate: {
      rawScore: scoreErrorRate(errorStats),
      weight: 0.10,
      label: 'Reliability',
      detail: `${(errorStats.errorRate * 100).toFixed(1)}% failed transactions`,
    },
  };

  // Weighted composite score (0–100)
  const compositeRaw = Object.values(breakdown).reduce(
    (acc, factor) => acc + factor.rawScore * factor.weight,
    0
  );

  const creditScore = mapToFICORange(compositeRaw);

  // Rating label
  let rating;
  if (creditScore >= 750) rating = 'Excellent';
  else if (creditScore >= 700) rating = 'Very Good';
  else if (creditScore >= 650) rating = 'Good';
  else if (creditScore >= 580) rating = 'Fair';
  else rating = 'Poor';

  // Loan terms based on score
  let loanOffer;
  if (creditScore >= 750) {
    loanOffer = { ltv: 90, apr: 4.5, maxAmount: 50000, tier: 'Premium' };
  } else if (creditScore >= 700) {
    loanOffer = { ltv: 80, apr: 7.0, maxAmount: 25000, tier: 'Standard' };
  } else if (creditScore >= 650) {
    loanOffer = { ltv: 70, apr: 10.0, maxAmount: 10000, tier: 'Basic' };
  } else if (creditScore >= 580) {
    loanOffer = { ltv: 60, apr: 15.0, maxAmount: 5000, tier: 'Restricted' };
  } else if (creditScore >= 500) {
    loanOffer = { ltv: 50, apr: 20.0, maxAmount: 2000, tier: 'Micro' };
  } else {
    loanOffer = null;
  }

  return {
    accountId,
    creditScore,
    compositeRaw: Math.round(compositeRaw),
    rating,
    breakdown,
    loanOffer,
    calculatedAt: new Date().toISOString(),
  };
}

module.exports = { calculateScore };
