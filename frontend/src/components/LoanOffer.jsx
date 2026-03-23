import React from 'react';

const TIER_COLORS = {
  Premium: { bg: 'from-emerald-900/40 to-emerald-800/20', border: 'border-emerald-500/40', badge: 'bg-emerald-500/20 text-emerald-300' },
  Standard: { bg: 'from-blue-900/40 to-blue-800/20', border: 'border-blue-500/40', badge: 'bg-blue-500/20 text-blue-300' },
  Basic: { bg: 'from-violet-900/40 to-violet-800/20', border: 'border-violet-500/40', badge: 'bg-violet-500/20 text-violet-300' },
  Restricted: { bg: 'from-amber-900/40 to-amber-800/20', border: 'border-amber-500/40', badge: 'bg-amber-500/20 text-amber-300' },
  Micro: { bg: 'from-orange-900/40 to-orange-800/20', border: 'border-orange-500/40', badge: 'bg-orange-500/20 text-orange-300' },
};

function StatCard({ label, value, sub }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-gray-400 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-gray-500">{sub}</div>}
    </div>
  );
}

export default function LoanOffer({ loanOffer, creditScore }) {
  if (!loanOffer) {
    return (
      <div className="rounded-xl border border-gray-700 bg-gray-900/60 p-6 text-center">
        <div className="text-4xl mb-3">⚠️</div>
        <h3 className="text-white font-semibold mb-1">No Loan Offer Available</h3>
        <p className="text-gray-400 text-sm">
          A credit score of at least 500 is required to qualify for DeFi credit.
          Your current score is <span className="text-red-400 font-semibold">{creditScore}</span>.
        </p>
        <p className="text-gray-500 text-xs mt-3">
          Increase your score by maintaining regular activity, holding HTS tokens, and avoiding failed transactions.
        </p>
      </div>
    );
  }

  const colors = TIER_COLORS[loanOffer.tier] || TIER_COLORS.Standard;

  return (
    <div className={`rounded-xl border ${colors.border} bg-gradient-to-br ${colors.bg} p-6`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-white font-semibold text-lg">Loan Offer Unlocked</h3>
          <p className="text-gray-400 text-sm">Based on your ScoreChain credit score</p>
        </div>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${colors.badge}`}>
          {loanOffer.tier} Tier
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4 py-4 border-y border-gray-700/50">
        <StatCard
          label="Max Amount"
          value={`$${loanOffer.maxAmount.toLocaleString()}`}
          sub="USDC"
        />
        <StatCard
          label="APR"
          value={`${loanOffer.apr}%`}
          sub="Annual Rate"
        />
        <StatCard
          label="Max LTV"
          value={`${loanOffer.ltv}%`}
          sub="Undercollat."
        />
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-xs text-gray-400">
          <span className="text-gray-300 font-medium">How it works:</span> Your credit score of{' '}
          <span className="text-white font-semibold">{creditScore}</span> qualifies you for up to{' '}
          <span className="text-white font-semibold">${loanOffer.maxAmount.toLocaleString()}</span> in
          undercollateralized credit at <span className="text-white font-semibold">{loanOffer.apr}% APR</span>.
          Only {100 - loanOffer.ltv}% collateral required.
        </p>
        <p className="text-xs text-gray-500">
          Loan terms are simulated for demonstration purposes. On-chain lending contracts would enforce these
          conditions via Hedera Smart Contract Service.
        </p>
      </div>

      <button
        className="mt-4 w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all
          bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500
          shadow-lg shadow-blue-900/30 active:scale-95"
        onClick={() => alert('This would open the DeFi lending interface in a production build.')}
      >
        Apply for Credit →
      </button>
    </div>
  );
}
