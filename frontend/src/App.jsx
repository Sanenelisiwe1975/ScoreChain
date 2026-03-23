import React, { useState, useCallback } from 'react';
import axios from 'axios';
import ScoreGauge from './components/ScoreGauge';
import ScoreBreakdown from './components/ScoreBreakdown';
import AgentLog from './components/AgentLog';
import LoanOffer from './components/LoanOffer';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// ── Pill badge ───────────────────────────────────────────────────────────────
function Badge({ children, color = 'blue' }) {
  const colors = {
    blue: 'bg-blue-900/40 text-blue-300 border-blue-500/30',
    green: 'bg-emerald-900/40 text-emerald-300 border-emerald-500/30',
    violet: 'bg-violet-900/40 text-violet-300 border-violet-500/30',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[color]}`}>
      {children}
    </span>
  );
}

// ── Section card ─────────────────────────────────────────────────────────────
function Card({ children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-gray-700/60 bg-gray-800/40 backdrop-blur p-6 ${className}`}>
      {children}
    </div>
  );
}

// ── HCS Proof panel ──────────────────────────────────────────────────────────
function HCSProof({ hcsProof, nftResult }) {
  if (!hcsProof) return null;
  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900/60 p-4 space-y-3">
      <h4 className="text-sm font-semibold text-white flex items-center gap-2">
        <span className="text-emerald-400">⛓</span> On-Chain Proof
      </h4>
      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-gray-400">HCS Topic</span>
          <code className="text-gray-200">{hcsProof.topicId}</code>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Sequence #</span>
          <code className="text-gray-200">{hcsProof.sequenceNumber}</code>
        </div>
        {nftResult && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">NFT Token</span>
              <code className="text-gray-200">{nftResult.tokenId}</code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">NFT Serial</span>
              <code className="text-gray-200">#{nftResult.serialNumber}</code>
            </div>
          </>
        )}
      </div>
      <a
        href={hcsProof.hashscanUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition-colors mt-1"
      >
        <span>View on HashScan</span>
        <span>↗</span>
      </a>
      {nftResult && (
        <a
          href={nftResult.hashscanUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs text-violet-400 hover:text-violet-300 transition-colors"
        >
          <span>View NFT on HashScan</span>
          <span>↗</span>
        </a>
      )}
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────────────────
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
    setAgentLog([{ timestamp: new Date().toISOString(), message: `Connecting to ScoreChain API...` }]);
    setActiveTab('gauge');

    try {
      const res = await axios.post(`${API_BASE}/api/score`, { accountId: accountId.trim() }, { timeout: 60000 });
      setResult(res.data);
      setAgentLog(res.data.agentLog || []);
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      setError(msg);
      if (err.response?.data?.agentLog) {
        setAgentLog(err.response.data.agentLog);
      }
    } finally {
      setIsLoading(false);
    }
  }, [accountId]);

  const tabs = [
    { id: 'gauge', label: 'Score' },
    { id: 'breakdown', label: 'Breakdown' },
    { id: 'loan', label: 'Loan Offer' },
    { id: 'proof', label: 'Proof' },
    { id: 'narrative', label: 'AI Report' },
  ];

  return (
    <div className="min-h-screen bg-[#080c18] text-gray-100">
      {/* Ambient blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-600/5 blur-3xl" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-violet-600/5 blur-3xl" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <header className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-xl shadow-lg shadow-blue-900/40">
              ◈
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
              ScoreChain
            </h1>
          </div>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            AI-powered DeFi credit scoring on the Hedera network.
            Analyze your on-chain reputation and unlock undercollateralized lending.
          </p>
          <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
            <Badge color="blue">Hedera Testnet</Badge>
            <Badge color="green">HCS Verified</Badge>
            <Badge color="violet">HTS Soul-bound NFT</Badge>
            <Badge color="blue">Claude AI</Badge>
          </div>
        </header>

        {/* Input section */}
        <Card className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Hedera Account ID
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleScore()}
              placeholder="e.g. 0.0.1234567"
              className="flex-1 bg-gray-900 border border-gray-600 rounded-xl px-4 py-3 text-white
                placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500
                font-mono text-sm transition-colors"
            />
            <button
              onClick={handleScore}
              disabled={isLoading || !accountId.trim()}
              className="px-6 py-3 rounded-xl font-semibold text-sm text-white transition-all
                bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500
                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-blue-600
                shadow-lg shadow-blue-900/30 active:scale-95 whitespace-nowrap"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analyzing...
                </span>
              ) : (
                'Generate My Score'
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Enter any Hedera Testnet account ID. The agent will query Mirror Node for on-chain data.
          </p>
        </Card>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-900/20 p-4">
            <p className="text-red-400 text-sm font-medium">Error: {error}</p>
          </div>
        )}

        {/* Main results grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Agent log */}
          <div className="lg:col-span-1">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Agent Decision Log
            </h2>
            <AgentLog logs={agentLog} isLoading={isLoading} />
          </div>

          {/* Right: Results */}
          <div className="lg:col-span-2">
            {(result || isLoading) && (
              <>
                {/* Tab navigation */}
                <div className="flex gap-1 mb-4 bg-gray-900/60 rounded-xl p-1 border border-gray-700/50">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${
                        activeTab === tab.id
                          ? 'bg-gray-700 text-white shadow'
                          : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <Card>
                  {isLoading && !result && (
                    <div className="flex flex-col items-center py-12 gap-4">
                      <div className="w-12 h-12 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                      <p className="text-gray-400 text-sm">Agent is analyzing the wallet...</p>
                    </div>
                  )}

                  {result && (
                    <>
                      {activeTab === 'gauge' && (
                        <div className="flex flex-col items-center gap-6">
                          <ScoreGauge score={result.scoreReport.creditScore} animated />
                          <div className="text-center">
                            <p className="text-gray-400 text-sm">
                              Account{' '}
                              <code className="text-gray-200 font-mono">{result.accountId}</code>
                            </p>
                            <p className="text-gray-500 text-xs mt-1">
                              Scored at {new Date(result.generatedAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      )}

                      {activeTab === 'breakdown' && (
                        <ScoreBreakdown breakdown={result.scoreReport.breakdown} />
                      )}

                      {activeTab === 'loan' && (
                        <LoanOffer
                          loanOffer={result.scoreReport.loanOffer}
                          creditScore={result.scoreReport.creditScore}
                        />
                      )}

                      {activeTab === 'proof' && (
                        <HCSProof hcsProof={result.hcsProof} nftResult={result.nftResult} />
                      )}

                      {activeTab === 'narrative' && (
                        <div className="space-y-4">
                          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                            <span className="text-violet-400">◈</span> AI Credit Report
                          </h3>
                          <div className="prose prose-invert prose-sm max-w-none">
                            <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                              {result.narrative}
                            </p>
                          </div>
                          <div className="text-xs text-gray-500 pt-2 border-t border-gray-700">
                            Generated by Claude (claude-sonnet-4-6) · Powered by Anthropic
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </Card>
              </>
            )}

            {/* Empty state */}
            {!result && !isLoading && !error && (
              <Card className="flex flex-col items-center justify-center py-16 text-center">
                <div className="text-6xl mb-4 opacity-30">◈</div>
                <h3 className="text-gray-300 font-semibold mb-2">Ready to Analyze</h3>
                <p className="text-gray-500 text-sm max-w-xs">
                  Enter a Hedera account ID above and click "Generate My Score" to run
                  the ScoreChain agent.
                </p>
              </Card>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center mt-16 text-gray-600 text-xs space-y-1">
          <p>ScoreChain — Built for the Hedera Hello Future Apex Hackathon 2026</p>
          <p>
            Powered by{' '}
            <span className="text-gray-500">Hedera Consensus Service · Hedera Token Service · Anthropic Claude</span>
          </p>
        </footer>
      </div>
    </div>
  );
}
