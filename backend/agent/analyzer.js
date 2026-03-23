/**
 * analyzer.js
 * Fetches and analyzes on-chain wallet data from Hedera Mirror Node REST API
 */

const axios = require('axios');

const MIRROR_NODE_BASE = {
  testnet: 'https://testnet.mirrornode.hedera.com/api/v1',
  mainnet: 'https://mainnet-public.mirrornode.hedera.com/api/v1',
};

const network = process.env.HEDERA_NETWORK || 'testnet';
const BASE_URL = MIRROR_NODE_BASE[network];

/**
 * Fetches complete account information
 */
async function getAccountInfo(accountId) {
  const res = await axios.get(`${BASE_URL}/accounts/${accountId}`);
  return res.data;
}

/**
 * Fetches all transactions for an account (paginated)
 */
async function getTransactions(accountId, limit = 100) {
  const transactions = [];
  let nextUrl = `${BASE_URL}/transactions?account.id=${accountId}&limit=100&order=desc`;

  let pages = 0;
  while (nextUrl && pages < 10) {
    const res = await axios.get(nextUrl);
    const data = res.data;
    transactions.push(...(data.transactions || []));
    nextUrl = data.links?.next ? `${BASE_URL.replace('/api/v1', '')}${data.links.next}` : null;
    pages++;
    if (transactions.length >= limit) break;
  }

  return transactions.slice(0, limit);
}

/**
 * Fetches all HTS token balances for an account
 */
async function getTokenBalances(accountId) {
  const res = await axios.get(`${BASE_URL}/accounts/${accountId}/tokens?limit=100`);
  return res.data.tokens || [];
}

/**
 * Computes the account age in months from the account creation timestamp
 */
function computeAccountAgeMonths(accountInfo) {
  if (!accountInfo?.created_timestamp) return 0;
  const createdMs = parseFloat(accountInfo.created_timestamp) * 1000;
  const now = Date.now();
  const diffMs = now - createdMs;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30));
}

/**
 * Analyzes transaction consistency: checks for dormant gaps > 30 days
 */
function analyzeConsistency(transactions) {
  if (transactions.length < 2) return { gapCount: 0, maxGapDays: 0 };

  const timestamps = transactions
    .map((tx) => parseFloat(tx.consensus_timestamp) * 1000)
    .sort((a, b) => a - b);

  let gapCount = 0;
  let maxGapDays = 0;

  for (let i = 1; i < timestamps.length; i++) {
    const gapDays = (timestamps[i] - timestamps[i - 1]) / (1000 * 60 * 60 * 24);
    if (gapDays > 30) gapCount++;
    if (gapDays > maxGapDays) maxGapDays = gapDays;
  }

  return { gapCount, maxGapDays: Math.floor(maxGapDays) };
}

/**
 * Counts failed vs successful transactions
 */
function analyzeErrorRate(transactions) {
  let failed = 0;
  let successful = 0;

  for (const tx of transactions) {
    if (tx.result === 'SUCCESS') successful++;
    else failed++;
  }

  const total = failed + successful;
  const errorRate = total > 0 ? failed / total : 0;
  return { failed, successful, total, errorRate };
}

/**
 * Main analysis function — returns structured wallet data for scorer
 */
async function analyzeWallet(accountId) {
  const steps = [];

  const log = (msg) => {
    steps.push({ timestamp: new Date().toISOString(), message: msg });
    console.log(`[Analyzer] ${msg}`);
  };

  log(`Starting analysis for ${accountId}...`);

  // 1. Account info
  log('Fetching account information from Mirror Node...');
  let accountInfo;
  try {
    accountInfo = await getAccountInfo(accountId);
  } catch (err) {
    throw new Error(`Account not found or invalid: ${accountId}`);
  }

  const ageMonths = computeAccountAgeMonths(accountInfo);
  log(`Account age: ${ageMonths} months`);

  // 2. Transactions
  log('Querying transaction history (up to 1000 records)...');
  let transactions = [];
  try {
    transactions = await getTransactions(accountId, 1000);
  } catch (err) {
    log(`Warning: Could not fetch transactions (${err.message}) — scoring with 0 transactions`);
  }
  log(`Retrieved ${transactions.length} transactions`);

  // 3. Consistency
  log('Analyzing transaction consistency and dormant gaps...');
  const consistency = analyzeConsistency(transactions);
  log(
    `Found ${consistency.gapCount} gap(s) > 30 days (max: ${consistency.maxGapDays} days)`
  );

  // 4. Error rate
  log('Calculating failed transaction ratio...');
  const errorStats = analyzeErrorRate(transactions);
  log(
    `${errorStats.failed} failed / ${errorStats.total} total (${(errorStats.errorRate * 100).toFixed(1)}% error rate)`
  );

  // 5. Token diversity
  log('Fetching HTS token holdings...');
  let tokens = [];
  try {
    tokens = await getTokenBalances(accountId);
  } catch (err) {
    log(`Warning: Could not fetch token balances (${err.message}) — scoring with 0 tokens`);
  }
  log(`Holds ${tokens.length} different HTS token(s)`);

  // 6. Balance
  const hbarBalance = accountInfo.balance?.balance || 0;
  const hbarHuman = hbarBalance / 1e8;
  log(`Current HBAR balance: ${hbarHuman.toFixed(4)} HBAR`);

  log('Analysis complete. Passing data to scorer...');

  return {
    accountId,
    ageMonths,
    transactionCount: transactions.length,
    consistency,
    errorStats,
    tokenCount: tokens.length,
    hbarBalance: hbarHuman,
    accountInfo,
    transactions: transactions.slice(0, 10), // sample for narrator
    steps,
  };
}

module.exports = { analyzeWallet };
