/**
 * hcsClient.js
 * Hedera Consensus Service integration:
 *   - Creates a topic (once, on first run)
 *   - Submits score messages to the topic
 */

const {
  Client,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
  PrivateKey,
  AccountId,
} = require('@hashgraph/sdk');

let hederaClient = null;

/**
 * Parses a private key string, handling both ECDSA (0x-prefixed or 64-char hex)
 * and ED25519 (DER-encoded) formats automatically.
 */
function parsePrivateKey(keyStr) {
  const stripped = keyStr.startsWith('0x') ? keyStr.slice(2) : keyStr;
  if (/^[0-9a-fA-F]{64}$/.test(stripped)) {
    return PrivateKey.fromStringECDSA(stripped);
  }
  return PrivateKey.fromStringED25519(keyStr);
}

function getClient() {
  if (hederaClient) return hederaClient;

  const accountId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID);
  const privateKey = parsePrivateKey(process.env.HEDERA_PRIVATE_KEY);

  const network = process.env.HEDERA_NETWORK || 'testnet';
  hederaClient =
    network === 'mainnet' ? Client.forMainnet() : Client.forTestnet();

  hederaClient.setOperator(accountId, privateKey);
  return hederaClient;
}

/**
 * Creates a new HCS topic for ScoreChain score logs.
 * Returns the topic ID string.
 */
async function createTopic() {
  const client = getClient();

  const transaction = await new TopicCreateTransaction()
    .setTopicMemo('ScoreChain Credit Score Audit Log')
    .execute(client);

  const receipt = await transaction.getReceipt(client);
  const topicId = receipt.topicId.toString();
  console.log(`[HCS] Created topic: ${topicId}`);
  return topicId;
}

/**
 * Submits a score record as an HCS message.
 * Returns the sequence number and transaction ID for hashscan link.
 */
async function submitScoreMessage(topicId, scoreReport) {
  const client = getClient();

  const payload = JSON.stringify({
    version: '1.0',
    accountId: scoreReport.accountId,
    creditScore: scoreReport.creditScore,
    rating: scoreReport.rating,
    compositeRaw: scoreReport.compositeRaw,
    breakdown: Object.fromEntries(
      Object.entries(scoreReport.breakdown).map(([k, v]) => [
        k,
        { score: v.rawScore, weight: v.weight, detail: v.detail },
      ])
    ),
    loanOffer: scoreReport.loanOffer,
    calculatedAt: scoreReport.calculatedAt,
  });

  const transaction = await new TopicMessageSubmitTransaction({
    topicId,
    message: payload,
  }).execute(client);

  const receipt = await transaction.getReceipt(client);
  const sequenceNumber = receipt.topicSequenceNumber?.toString() || '0';
  const txId = transaction.transactionId.toString();

  console.log(`[HCS] Submitted score to topic ${topicId} — sequence #${sequenceNumber}`);

  const network = process.env.HEDERA_NETWORK || 'testnet';
  const hashscanUrl =
    network === 'mainnet'
      ? `https://hashscan.io/mainnet/topic/${topicId}?sequenceNumber=${sequenceNumber}`
      : `https://hashscan.io/testnet/topic/${topicId}?sequenceNumber=${sequenceNumber}`;

  return {
    topicId,
    sequenceNumber,
    transactionId: txId,
    hashscanUrl,
  };
}

module.exports = { createTopic, submitScoreMessage, getClient, parsePrivateKey };
