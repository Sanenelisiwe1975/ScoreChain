# ScoreChain — DeFi Credit Scoring Agent on Hedera

> An AI agent that analyzes on-chain wallet behavior to generate a portable, verifiable credit score stored on Hedera Consensus Service and minted as an HTS soul-bound NFT — unlocking undercollateralized lending in DeFi.

Built for the **Hedera Hello Future Apex Hackathon 2026**.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                        │
│  ┌──────────┐ ┌───────────────┐ ┌──────────┐ ┌─────────────┐  │
│  │ScoreGauge│ │ScoreBreakdown │ │AgentLog  │ │ LoanOffer   │  │
│  └──────────┘ └───────────────┘ └──────────┘ └─────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP (REST)
┌───────────────────────────▼─────────────────────────────────────┐
│                    Backend (Node.js + Express)                   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Agent Pipeline                        │   │
│  │  analyzer.js → scorer.js → narrator.js (Claude API)     │   │
│  └───────────────────────────────────────────────────────┬─┘   │
│                                                           │      │
│  ┌────────────────────────┐  ┌────────────────────────┐  │      │
│  │  hcsClient.js          │  │  htsClient.js          │  │      │
│  │  (Topic + Messages)    │  │  (NFT Collection+Mint) │  │      │
│  └──────────┬─────────────┘  └───────────┬────────────┘  │      │
└─────────────┼──────────────────────────── ┼──────────────┘      │
              │                             │
┌─────────────▼─────────────────────────────▼──────────────────┐
│                      Hedera Network                           │
│                                                               │
│   Mirror Node REST API    HCS (Audit Log)    HTS (NFT)        │
│   (on-chain data query)   (score messages)  (soul-bound)      │
└───────────────────────────────────────────────────────────────┘
```

---

## Features

| Feature | Description |
|---|---|
| **Wallet Analyzer** | Queries Hedera Mirror Node for account age, tx history, token holdings, and balance |
| **Scoring Algorithm** | Weighted 6-factor model producing a 300–850 FICO-like score |
| **HCS Audit Log** | Every score submitted as an immutable Hedera Consensus Service message |
| **Soul-bound NFT** | Non-transferable HTS NFT minted per wallet with score metadata |
| **AI Narrative** | Claude generates a human-readable credit report for each score |
| **Loan Offers** | Score-gated undercollateralized lending tiers |
| **Live Agent Log** | Real-time UI feed showing agent reasoning steps |

---

## Scoring Algorithm

Each factor is scored 0–100, then weighted:

| Factor | Weight | Logic |
|---|---|---|
| Account Age | 20% | `<3mo=0`, `3-12mo=50`, `1-2yr=75`, `2yr+=100` |
| Transaction Volume | 20% | Tiered by total tx count (0→100) |
| Activity Consistency | 20% | Penalizes dormant gaps > 30 days |
| Token Diversity | 15% | Number of unique HTS tokens held |
| Balance Stability | 15% | HBAR balance tiers (higher = better) |
| Error Rate | 10% | Penalizes failed transaction ratio |

```
composite_raw = Σ (factor_score × weight)          # 0–100
credit_score  = 300 + (composite_raw / 100) × 550  # 300–850
```

### Loan Tiers

| Score Range | Tier | LTV | APR | Max Amount |
|---|---|---|---|---|
| 750–850 | Premium | 90% | 4.5% | $50,000 |
| 700–749 | Standard | 80% | 7.0% | $25,000 |
| 650–699 | Basic | 70% | 10.0% | $10,000 |
| 580–649 | Restricted | 60% | 15.0% | $5,000 |
| 500–579 | Micro | 50% | 20.0% | $2,000 |
| <500 | — | No offer | — | — |

---

## Setup & Installation

### Prerequisites
- Node.js 18+
- A Hedera Testnet account ([portal.hedera.com](https://portal.hedera.com))
- Anthropic API key ([console.anthropic.com](https://console.anthropic.com))

### 1. Clone and install

```bash
git clone <repo-url>
cd ScoreChain

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Configure environment

```bash
cd backend
cp ../.env.example .env
# Edit .env with your credentials
```

```env
HEDERA_ACCOUNT_ID=0.0.XXXXXX
HEDERA_PRIVATE_KEY=your_ecdsa_private_key_here
HEDERA_NETWORK=testnet
ANTHROPIC_API_KEY=sk-ant-XXXXXXXXXX
```

Leave `HCS_TOPIC_ID` and `HTS_TOKEN_ID` blank — the server creates them automatically on first run and prints the IDs. Paste them back into `.env` to persist across restarts.

### 3. Start the backend

```bash
cd backend
npm run dev
```

On first run you'll see:
```
[Init] No HCS topic found — creating one...
[Init] HCS Topic created: 0.0.XXXXXXX
[Init] Add to .env: HCS_TOPIC_ID=0.0.XXXXXXX
[Init] No HTS token found — creating NFT collection...
[Init] HTS Token created: 0.0.XXXXXXX
[Init] Add to .env: HTS_TOKEN_ID=0.0.XXXXXXX

🚀 ScoreChain API running on http://localhost:3001
```

### 4. Start the frontend

```bash
cd frontend
npm start
# Opens http://localhost:3000
```

---

## API Reference

### `POST /api/score`
Trigger the full scoring pipeline for a wallet.

```json
// Request
{ "accountId": "0.0.1234567" }

// Response
{
  "accountId": "0.0.1234567",
  "scoreReport": {
    "creditScore": 724,
    "rating": "Very Good",
    "compositeRaw": 77,
    "breakdown": { ... },
    "loanOffer": { "ltv": 80, "apr": 7.0, "maxAmount": 25000, "tier": "Standard" }
  },
  "hcsProof": {
    "topicId": "0.0.XXXXX",
    "sequenceNumber": "42",
    "hashscanUrl": "https://hashscan.io/testnet/topic/0.0.XXXXX?sequenceNumber=42"
  },
  "nftResult": {
    "tokenId": "0.0.XXXXX",
    "serialNumber": "1",
    "hashscanUrl": "https://hashscan.io/testnet/token/0.0.XXXXX/1"
  },
  "narrative": "Your ScoreChain credit score of 724...",
  "agentLog": [ { "timestamp": "...", "message": "..." } ]
}
```

### `GET /api/score/:id`
Fetch the cached score for a wallet (5-minute TTL).

### `GET /api/history/:id`
Fetch the full HCS audit history of scores for a wallet from the consensus topic.

### `GET /api/health`
Health check — returns network, topic, and token IDs.

---

## How to Run on Hedera Testnet

1. Get a free testnet account at [portal.hedera.com](https://portal.hedera.com)
2. Fund it with testnet HBAR from the faucet
3. Add credentials to `.env`
4. Start the backend — HCS topic and HTS collection auto-created
5. Open the frontend, enter any testnet account ID, click **Generate My Score**
6. View your on-chain proof at hashscan.io

---

## Hackathon Judging Criteria Alignment

### 1. Innovation & Creativity
ScoreChain introduces a novel financial primitive: **on-chain reputation as collateral**. Instead of requiring overcollateralization (the DeFi norm), it uses verifiable wallet behavior to determine creditworthiness — a concept with massive real-world impact for the unbanked.

### 2. Technical Execution
- Full Hedera JS SDK integration (HCS + HTS)
- Mirror Node REST API for data queries
- Claude AI for narrative generation
- Production-ready React frontend with live agent log, charts, and score visualization

### 3. Use of Hedera Technologies
| Technology | Usage |
|---|---|
| **HCS** | Immutable, tamper-proof audit log of every credit score calculation |
| **HTS** | Soul-bound NFT representing the wallet's credit identity |
| **Mirror Node** | On-chain data source for the scoring algorithm |

### 4. Real-World Applicability
Credit scoring is a $12B+ industry globally. Blockchain-native credit scores enable:
- Undercollateralized DeFi lending
- Cross-protocol reputation portability
- Financial inclusion for the unbanked
- Programmable loan terms enforced by smart contracts

### 5. User Experience
- Zero-friction: just enter an account ID (no wallet extension needed for demo)
- Live agent decision log shows transparency
- Animated score reveal with gauge, charts, and AI narrative
- One-click HashScan verification links

### 6. Business Potential
ScoreChain could become the **credit bureau of Web3** — a protocol layer that other DeFi apps query before issuing credit. Revenue model: per-score fees + protocol token for governance.

### 7. Code Quality & Architecture
- Clean separation of concerns: analyzer → scorer → narrator → Hedera clients
- Stateless scoring algorithm with documented weights
- Environment-driven configuration
- Error handling throughout the pipeline

---

## License

MIT — Built for the Hedera Hello Future Apex Hackathon 2026
