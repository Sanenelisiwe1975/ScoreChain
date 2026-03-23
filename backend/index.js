/**
 * index.js
 * ScoreChain Express API Server
 *
 * Routes:
 *   POST /api/score         — Trigger full scoring pipeline for a wallet
 *   GET  /api/score/:id     — Fetch latest score for a wallet (from cache)
 *   GET  /api/history/:id   — Fetch HCS audit history for a wallet
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const NodeCache = require('node-cache');
const axios = require('axios');

const { analyzeWallet } = require('./agent/analyzer');
const { calculateScore } = require('./agent/scorer');
const { generateNarrative } = require('./agent/narrator');
const { submitScoreMessage, createTopic } = require('./hedera/hcsClient');
const { mintCreditScoreNFT, createNFTCollection } = require('./hedera/htsClient');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// In-memory cache — 5 minute TTL
const cache = new NodeCache({ stdTTL: 300 });

// Validate required env vars
const requiredEnv = ['HEDERA_ACCOUNT_ID', 'HEDERA_PRIVATE_KEY', 'ANTHROPIC_API_KEY'];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

// ── Hedera resource initialization ──────────────────────────────────────────

let HCS_TOPIC_ID = process.env.HCS_TOPIC_ID || null;
let HTS_TOKEN_ID = process.env.HTS_TOKEN_ID || null;

async function ensureHederaResources() {
  if (!HCS_TOPIC_ID) {
    console.log('[Init] No HCS topic found — creating one...');
    HCS_TOPIC_ID = await createTopic();
    console.log(`[Init] HCS Topic created: ${HCS_TOPIC_ID}`);
    console.log(`[Init] Add to .env: HCS_TOPIC_ID=${HCS_TOPIC_ID}`);
  }

  if (!HTS_TOKEN_ID) {
    console.log('[Init] No HTS token found — creating NFT collection...');
    HTS_TOKEN_ID = await createNFTCollection();
    console.log(`[Init] HTS Token created: ${HTS_TOKEN_ID}`);
    console.log(`[Init] Add to .env: HTS_TOKEN_ID=${HTS_TOKEN_ID}`);
  }
}

// ── Routes ───────────────────────────────────────────────────────────────────

/**
 * POST /api/score
 * Body: { accountId: "0.0.XXXXX" }
 * Runs the full scoring pipeline.
 */
app.post('/api/score', async (req, res) => {
  const { accountId } = req.body;

  if (!accountId || !accountId.match(/^0\.0\.\d+$/)) {
    return res.status(400).json({
      error: 'Invalid Hedera account ID. Format: 0.0.XXXXX',
    });
  }

  const agentLog = [];
  const emit = (message) => {
    agentLog.push({ timestamp: new Date().toISOString(), message });
    console.log(`[Agent] ${message}`);
  };

  try {
    emit(`Initializing ScoreChain agent for ${accountId}...`);

    // Step 1: Analyze wallet
    emit('Connecting to Hedera Mirror Node...');
    const analysisData = await analyzeWallet(accountId);
    agentLog.push(...analysisData.steps);

    // Step 2: Calculate score
    emit('Running scoring algorithm across 6 weighted factors...');
    const scoreReport = calculateScore(analysisData);
    emit(`Score calculated: ${scoreReport.creditScore} (${scoreReport.rating})`);

    // Step 3: Submit to HCS
    emit(`Submitting score to Hedera Consensus Service topic ${HCS_TOPIC_ID}...`);
    const hcsProof = await submitScoreMessage(HCS_TOPIC_ID, scoreReport);
    emit(`HCS message confirmed — sequence #${hcsProof.sequenceNumber}`);
    emit(`Proof: ${hcsProof.hashscanUrl}`);

    // Step 4: Mint NFT
    emit(`Minting soul-bound credit score NFT on HTS token ${HTS_TOKEN_ID}...`);
    const nftResult = await mintCreditScoreNFT(HTS_TOKEN_ID, scoreReport, hcsProof);
    emit(`NFT minted — serial #${nftResult.serialNumber}`);

    // Step 5: Generate AI narrative
    emit('Generating AI-powered credit report narrative via Claude...');
    const narrative = await generateNarrative(scoreReport, analysisData);
    emit('Narrative generated. Analysis complete!');

    const result = {
      accountId,
      scoreReport,
      hcsProof,
      nftResult,
      narrative,
      agentLog,
      generatedAt: new Date().toISOString(),
    };

    // Cache the result
    cache.set(`score:${accountId}`, result);

    return res.json(result);
  } catch (err) {
    console.error('[Error]', err.message);
    agentLog.push({
      timestamp: new Date().toISOString(),
      message: `Error: ${err.message}`,
    });
    return res.status(500).json({
      error: err.message,
      agentLog,
    });
  }
});

/**
 * GET /api/score/:id
 * Returns the cached score for a wallet.
 */
app.get('/api/score/:id', (req, res) => {
  const accountId = req.params.id;
  const cached = cache.get(`score:${accountId}`);

  if (!cached) {
    return res.status(404).json({ error: 'No score found for this account. Run /api/score first.' });
  }

  return res.json(cached);
});

/**
 * GET /api/history/:id
 * Fetches HCS topic messages for score audit history.
 */
app.get('/api/history/:id', async (req, res) => {
  const accountId = req.params.id;
  const network = process.env.HEDERA_NETWORK || 'testnet';
  const mirrorBase =
    network === 'mainnet'
      ? 'https://mainnet-public.mirrornode.hedera.com/api/v1'
      : 'https://testnet.mirrornode.hedera.com/api/v1';

  if (!HCS_TOPIC_ID) {
    return res.status(503).json({ error: 'HCS topic not initialized yet.' });
  }

  try {
    const response = await axios.get(`${mirrorBase}/topics/${HCS_TOPIC_ID}/messages?limit=50&order=desc`);
    const messages = response.data.messages || [];

    const history = messages
      .map((msg) => {
        try {
          const payload = JSON.parse(Buffer.from(msg.message, 'base64').toString('utf8'));
          return payload.accountId === accountId ? { ...payload, consensusTimestamp: msg.consensus_timestamp } : null;
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    return res.json({ accountId, topicId: HCS_TOPIC_ID, history });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/health
 * Health check
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hcsTopicId: HCS_TOPIC_ID,
    htsTokenId: HTS_TOKEN_ID,
    network: process.env.HEDERA_NETWORK || 'testnet',
  });
});

// ── Start ────────────────────────────────────────────────────────────────────

async function start() {
  try {
    await ensureHederaResources();
    app.listen(PORT, () => {
      console.log(`\n🚀 ScoreChain API running on http://localhost:${PORT}`);
      console.log(`   HCS Topic : ${HCS_TOPIC_ID}`);
      console.log(`   HTS Token : ${HTS_TOKEN_ID}`);
      console.log(`   Network   : ${process.env.HEDERA_NETWORK || 'testnet'}\n`);
    });
  } catch (err) {
    console.error('Failed to initialize Hedera resources:', err.message);
    process.exit(1);
  }
}

start();
