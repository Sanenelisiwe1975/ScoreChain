import React, { useState, useCallback } from 'react';
import axios from 'axios';
import ScoreGauge from './components/ScoreGauge';
import ScoreBreakdown from './components/ScoreBreakdown';
import AgentLog from './components/AgentLog';
import LoanOffer from './components/LoanOffer';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Translate raw Hedera/SDK errors into friendly messages
function friendlyError(msg) {
  if (!msg) return 'Something went wrong. Please try again.';
  if (msg.includes('INVALID_SIGNATURE'))
    return 'Transaction signing failed. Check that your HEDERA_PRIVATE_KEY in backend/.env matches the account and is the correct key type (ECDSA vs ED25519).';
  if (msg.includes('INSUFFICIENT_PAYER_BALANCE'))
    return 'Your Hedera account has insufficient HBAR. Fund it at the Hedera testnet faucet.';
  if (msg.includes('Account not found') || msg.includes('404'))
    return 'Account not found on the Hedera network. Check the account ID format (e.g. 0.0.1234567).';
  if (msg.includes('INVALID_ACCOUNT_ID'))
    return 'Invalid account ID. Use the format 0.0.XXXXXXX.';
  if (msg.includes('Network Error') || msg.includes('ECONNREFUSED'))
    return 'Cannot reach the ScoreChain backend. Make sure the backend is running on port 3001.';
  if (msg.includes('timeout'))
    return 'The request timed out. The Hedera network may be slow — please try again.';
  return msg;
}

function Badge({ children, color = 'blue' }) {
  const styles = {
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    violet: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${styles[color]}`}>
      {children}
    </span>
  );
}

function HCSProof({ hcsProof, nftResult }) {
  if (!hcsProof) return null;
  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-white flex items-center gap-2">
        <span className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm">⛓</span>
        On-Chain Proof
      </h3>
      <div className="space-y-3">
        {[
          { label: 'HCS Topic ID', value: hcsProof.topicId },
          { label: 'Sequence Number', value: `#${hcsProof.sequenceNumber}` },
          ...(nftResult ? [
            { label: 'NFT Token ID', value: nftResult.tokenId },
            { label: 'NFT Serial', value: `#${nftResult.serialNumber}` },
          ] : []),
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between py-2 border-b border-gray-800">
            <span className="text-sm text-gray-500">{label}</span>
            <code className="text-sm text-gray-200 font-mono">{value}</code>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2 pt-2">
        <a href={hcsProof.hashscanUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl
            bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20
            text-emerald-400 text-sm font-medium transition-all group">
          <span>View HCS message on HashScan</span>
          <span className="group-hover:translate-x-0.5 transition-transform">↗</span>
        </a>
        {nftResult && (
          <a href={nftResult.hashscanUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl
              bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20
              text-violet-400 text-sm font-medium transition-all group">
            <span>View soul-bound NFT on HashScan</span>
            <span className="group-hover:translate-x-0.5 transition-transform">↗</span>
          </a>
        )}
      </div>
    </div>
  );
}

const TABS = [
  { id: 'gauge',     label: 'Score',     icon: '◈' },
  { id: 'breakdown', label: 'Breakdown', icon: '▦' },
  { id: 'loan',      label: 'Loan Offer',icon: '◎' },
  { id: 'proof',     label: 'Proof',     icon: '⛓' },
  { id: 'narrative', label: 'AI Report', icon: '✦' },
];

const HOW_IT_WORKS = [
  { icon: '🔍', title: 'Analyze', desc: 'Agent queries your full on-chain history via Hedera Mirror Node' },
  { icon: '📊', title: 'Score',   desc: '6-factor weighted algorithm produces a 300–850 FICO-like score' },
  { icon: '⛓',  title: 'Verify', desc: 'Score logged immutably on Hedera Consensus Service' },
  { icon: '🪙',  title: 'Mint',   desc: 'Soul-bound NFT issued as your portable credit identity' },
];

export default function App() {
  const [accountId, setAccountId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [agentLog, setAgentLog] = useState([]);
  const [activeTab, setActiveTab] = useState('gauge');

  const handleScore = useCallback(async () => {
    if (!accountId.trim()) return;
    setIsLoading(true);
    setResult(null);
    setError(null);
    setAgentLog([{ timestamp: new Date().toISOString(), message: 'Connecting to ScoreChain API...' }]);
    setActiveTab('gauge');
    try {
      const res = await axios.post(
        `${API_BASE}/api/score`,
        { accountId: accountId.trim() },
        { timeout: 60000 }
      );
      setResult(res.data);
      setAgentLog(res.data.agentLog || []);
    } catch (err) {
      const raw = err.response?.data?.error || err.message;
      setError(friendlyError(raw));
      if (err.response?.data?.agentLog) setAgentLog(err.response.data.agentLog);
    } finally {
      setIsLoading(false);
    }
  }, [accountId]);

  const showResults = result || isLoading;

  return (
    <div className="min-h-screen bg-[#070912] text-gray-100 antialiased">
      {/* Background glow orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-15%] left-[-5%] w-[700px] h-[700px] rounded-full bg-blue-700/8 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-5%] w-[600px] h-[600px] rounded-full bg-violet-700/8 blur-[100px]" />
        <div className="absolute top-[40%] left-[50%] w-[400px] h-[400px] rounded-full bg-cyan-700/5 blur-[100px]" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-12 lg:py-16">

        {/* ── Header ─────────────────────────────────────────────── */}
        <header className="text-center mb-14">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-violet-600
              flex items-center justify-center text-2xl shadow-lg shadow-blue-900/50 ring-1 ring-white/10">
              ◈
            </div>
            <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-white via-blue-100 to-violet-300 bg-clip-text text-transparent">
              ScoreChain
            </h1>
          </div>
          <p className="text-gray-400 text-lg max-w-lg mx-auto leading-relaxed mb-6">
            Your on-chain reputation, scored. Unlock undercollateralized DeFi lending
            using your Hedera wallet history — no credit agency required.
          </p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <Badge color="blue">Hedera Testnet</Badge>
            <Badge color="green">HCS Verified</Badge>
            <Badge color="violet">Soul-bound NFT</Badge>
            <Badge color="amber">Claude AI</Badge>
          </div>
        </header>

        {/* ── Score Input ─────────────────────────────────────────── */}
        <div className="max-w-2xl mx-auto mb-10">
          <div className="rounded-2xl border border-gray-700/50 bg-gray-900/50 backdrop-blur-sm p-6 shadow-xl shadow-black/30">
            <label className="block text-sm font-semibold text-gray-300 mb-1">
              Hedera Account ID
            </label>
            <p className="text-xs text-gray-500 mb-3">Enter any Hedera Testnet account — format: 0.0.XXXXXXX</p>
            <div className="flex gap-3">
              <input
                type="text"
                value={accountId}
                onChange={e => setAccountId(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !isLoading && handleScore()}
                placeholder="e.g. 0.0.1234567"
                className="flex-1 bg-gray-950 border border-gray-700 rounded-xl px-4 py-3
                  text-white placeholder-gray-600 font-mono text-sm
                  focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50
                  transition-all"
              />
              <button
                onClick={handleScore}
                disabled={isLoading || !accountId.trim()}
                className="px-6 py-3 rounded-xl font-semibold text-sm text-white
                  bg-gradient-to-r from-blue-600 to-violet-600
                  hover:from-blue-500 hover:to-violet-500
                  disabled:opacity-40 disabled:cursor-not-allowed
                  shadow-lg shadow-blue-900/40
                  active:scale-95 transition-all whitespace-nowrap"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Analyzing...
                  </span>
                ) : 'Generate My Score'}
              </button>
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-950/40 p-4 flex gap-3">
              <span className="text-red-400 text-lg shrink-0">⚠</span>
              <p className="text-red-300 text-sm leading-relaxed">{error}</p>
            </div>
          )}
        </div>

        {/* ── Main layout ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">

          {/* Agent Log */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 px-1">
              Agent Decision Log
            </p>
            <AgentLog logs={agentLog} isLoading={isLoading} />
          </div>

          {/* Results panel */}
          <div>
            {showResults ? (
              <>
                {/* Tab bar */}
                <div className="flex gap-1 mb-4 bg-gray-900/80 rounded-xl p-1 border border-gray-800">
                  {TABS.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5
                        ${activeTab === tab.id
                          ? 'bg-gray-700/80 text-white shadow-sm'
                          : 'text-gray-500 hover:text-gray-300'}`}
                    >
                      <span>{tab.icon}</span>
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  ))}
                </div>

                <div className="rounded-2xl border border-gray-700/50 bg-gray-900/50 backdrop-blur-sm p-6 shadow-xl shadow-black/30 min-h-[380px]">
                  {isLoading && !result && (
                    <div className="flex flex-col items-center justify-center h-72 gap-4">
                      <div className="relative">
                        <div className="w-16 h-16 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center text-2xl">◈</div>
                      </div>
                      <div className="text-center">
                        <p className="text-white font-medium">Agent is working...</p>
                        <p className="text-gray-500 text-sm mt-1">Querying Mirror Node and calculating score</p>
                      </div>
                    </div>
                  )}

                  {result && (
                    <>
                      {activeTab === 'gauge' && (
                        <div className="flex flex-col items-center gap-4">
                          <ScoreGauge score={result.scoreReport.creditScore} animated />
                          <div className="text-center">
                            <p className="text-gray-400 text-sm">
                              Score for <code className="text-gray-200 font-mono bg-gray-800 px-2 py-0.5 rounded">{result.accountId}</code>
                            </p>
                            <p className="text-gray-600 text-xs mt-1">
                              {new Date(result.generatedAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      )}
                      {activeTab === 'breakdown' && <ScoreBreakdown breakdown={result.scoreReport.breakdown} />}
                      {activeTab === 'loan' && (
                        <LoanOffer loanOffer={result.scoreReport.loanOffer} creditScore={result.scoreReport.creditScore} />
                      )}
                      {activeTab === 'proof' && (
                        <HCSProof hcsProof={result.hcsProof} nftResult={result.nftResult} />
                      )}
                      {activeTab === 'narrative' && (
                        <div className="space-y-4">
                          <h3 className="text-base font-semibold text-white flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-violet-500/20 flex items-center justify-center text-violet-400 text-sm">✦</span>
                            AI Credit Report
                          </h3>
                          <p className="text-gray-300 leading-relaxed whitespace-pre-wrap text-sm">
                            {result.narrative}
                          </p>
                          <p className="text-xs text-gray-600 pt-3 border-t border-gray-800">
                            Generated by Claude (claude-sonnet-4-6) · Anthropic
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            ) : (
              /* Empty / How it works state */
              <div className="rounded-2xl border border-gray-800/60 bg-gray-900/30 backdrop-blur-sm p-8">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-6">How it works</p>
                <div className="grid grid-cols-2 gap-4 mb-8">
                  {HOW_IT_WORKS.map(({ icon, title, desc }) => (
                    <div key={title} className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
                      <div className="text-2xl mb-2">{icon}</div>
                      <p className="text-sm font-semibold text-white mb-1">{title}</p>
                      <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border border-blue-500/15 bg-blue-500/5 p-4 text-center">
                  <p className="text-blue-300 text-sm font-medium mb-1">Ready to score your wallet</p>
                  <p className="text-gray-500 text-xs">Enter a Hedera account ID above and click Generate My Score</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────── */}
        <footer className="text-center mt-16 space-y-1">
          <p className="text-gray-600 text-xs">
            ScoreChain — Built for the <span className="text-gray-500">Hedera Hello Future Apex Hackathon 2026</span>
          </p>
          <p className="text-gray-700 text-xs">
            Hedera Consensus Service · Hedera Token Service · Anthropic Claude
          </p>
        </footer>
      </div>
    </div>
  );
}
