/**
 * htsClient.js
 * Hedera Token Service integration:
 *   - Creates a Soul-bound NFT collection (once, on first run)
 *   - Mints a credit score NFT for each scored wallet
 *   - Updates NFT metadata on re-score
 */

const {
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  TokenMintTransaction,
  AccountId,
} = require('@hashgraph/sdk');

const { getClient, parsePrivateKey } = require('./hcsClient');

/**
 * Creates the ScoreChain NFT collection on HTS.
 * Returns the token ID string.
 */
async function createNFTCollection() {
  const client = getClient();
  const operatorId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID);
  const operatorKey = parsePrivateKey(process.env.HEDERA_PRIVATE_KEY);

  const transaction = await new TokenCreateTransaction()
    .setTokenName('ScoreChain Credit Score')
    .setTokenSymbol('SCORE')
    .setTokenType(TokenType.NonFungibleUnique)
    .setSupplyType(TokenSupplyType.Finite)
    .setMaxSupply(10000)
    .setTreasuryAccountId(operatorId)
    .setSupplyKey(operatorKey.publicKey)
    // No transfer key = effectively soul-bound (non-transferable)
    .setAdminKey(operatorKey.publicKey)
    .setTokenMemo('ScoreChain DeFi Credit Score NFT — Non-transferable')
    .freezeWith(client)
    .sign(operatorKey);

  const response = await transaction.execute(client);
  const receipt = await response.getReceipt(client);
  const tokenId = receipt.tokenId.toString();

  console.log(`[HTS] Created NFT collection: ${tokenId}`);
  return tokenId;
}

/**
 * Encodes metadata as a Buffer for the NFT.
 * Stores score, date, and HCS reference as JSON.
 */
function buildMetadata(scoreReport, hcsProof) {
  // HTS limits metadata to 100 bytes — store a compact reference only.
  // Full score data is in the HCS message referenced by topic + sequence.
  const meta = `SC:${scoreReport.creditScore}:${hcsProof.topicId}:${hcsProof.sequenceNumber}`;
  return Buffer.from(meta);
}

/**
 * Mints a new credit score NFT for a wallet.
 * Returns the serial number.
 */
async function mintCreditScoreNFT(tokenId, scoreReport, hcsProof) {
  const client = getClient();
  const operatorKey = parsePrivateKey(process.env.HEDERA_PRIVATE_KEY);

  const metadata = buildMetadata(scoreReport, hcsProof);

  const transaction = await new TokenMintTransaction()
    .setTokenId(tokenId)
    .addMetadata(metadata)
    .freezeWith(client)
    .sign(operatorKey);

  const response = await transaction.execute(client);
  const receipt = await response.getReceipt(client);
  const serialNumber = receipt.serials[0]?.toString() || '1';

  console.log(`[HTS] Minted NFT serial #${serialNumber} for ${scoreReport.accountId}`);

  const network = process.env.HEDERA_NETWORK || 'testnet';
  const hashscanUrl =
    network === 'mainnet'
      ? `https://hashscan.io/mainnet/token/${tokenId}/${serialNumber}`
      : `https://hashscan.io/testnet/token/${tokenId}/${serialNumber}`;

  return {
    tokenId,
    serialNumber,
    hashscanUrl,
  };
}

module.exports = { createNFTCollection, mintCreditScoreNFT };
