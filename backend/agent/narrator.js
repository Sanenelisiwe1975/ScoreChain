/**
 * narrator.js
 * Uses Claude API to generate a human-readable explanation of the credit score.
 */

const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Generates a narrative explanation of the credit score using Claude
 */
async function generateNarrative(scoreReport, analysisData) {
  const { creditScore, rating, breakdown, loanOffer, accountId } = scoreReport;
  const { ageMonths, transactionCount, consistency, errorStats, tokenCount, hbarBalance } =
    analysisData;

  const breakdownText = Object.values(breakdown)
    .map(
      (f) =>
        `- ${f.label}: ${f.rawScore}/100 (weight: ${f.weight * 100}%) — ${f.detail}`
    )
    .join('\n');

  const prompt = `You are ScoreChain, an AI-powered DeFi credit scoring agent built on the Hedera network.
You have just analyzed a wallet and computed its credit score. Write a concise, professional, and encouraging
2-3 paragraph summary explaining the score to the wallet owner.

Wallet: ${accountId}
Credit Score: ${creditScore}/850 (${rating})
Account Age: ${ageMonths} months
Total Transactions: ${transactionCount}
HTS Tokens Held: ${tokenCount}
HBAR Balance: ${hbarBalance.toFixed(4)} HBAR
Failed Transaction Rate: ${(errorStats.errorRate * 100).toFixed(1)}%
Dormant Gaps (>30 days): ${consistency.gapCount}

Score Breakdown:
${breakdownText}

${loanOffer ? `Loan Offer Unlocked: ${loanOffer.tier} tier — up to $${loanOffer.maxAmount.toLocaleString()} at ${loanOffer.apr}% APR with ${loanOffer.ltv}% LTV` : 'No loan offer available at this time.'}

Write the explanation in plain English. Mention what is helping their score, what could be improved,
and what their score means for their DeFi borrowing potential on the Hedera network.
Keep it under 200 words. Be factual and specific.`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  });

  return message.content[0].text;
}

module.exports = { generateNarrative };
