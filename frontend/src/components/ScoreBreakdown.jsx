import React from 'react';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
} from 'recharts';

function getBarColor(score) {
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#3b82f6';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

export default function ScoreBreakdown({ breakdown }) {
  if (!breakdown) return null;

  const factors = Object.values(breakdown);

  const barData = factors.map((f) => ({
    name: f.label.replace('Transaction ', 'Tx ').replace('Activity ', '').replace(' Stability', ''),
    score: f.rawScore,
    weight: Math.round(f.weight * 100),
    detail: f.detail,
  }));

  const radarData = factors.map((f) => ({
    subject: f.label.replace('Transaction ', 'Tx ').replace('Activity ', '').replace(' Stability', ''),
    score: f.rawScore,
    fullMark: 100,
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm shadow-xl">
          <p className="text-white font-semibold">{d.name || d.subject}</p>
          <p className="text-emerald-400">Score: {d.score}/100</p>
          {d.weight && <p className="text-gray-400">Weight: {d.weight}%</p>}
          {d.detail && <p className="text-gray-400 mt-1">{d.detail}</p>}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-white">Score Breakdown</h3>

      {/* Bar Chart */}
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={barData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2942" />
            <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} />
            <YAxis domain={[0, 100]} tick={{ fill: '#9ca3af', fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="score" radius={[4, 4, 0, 0]}>
              {barData.map((entry, index) => (
                <Cell key={index} fill={getBarColor(entry.score)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Radar Chart */}
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData}>
            <PolarGrid stroke="#1e2942" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 10 }} />
            <Radar name="Score" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} />
            <Tooltip content={<CustomTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Factor details list */}
      <div className="space-y-2">
        {factors.map((f, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-28 text-xs text-gray-400 text-right shrink-0">{f.label}</div>
            <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${f.rawScore}%`,
                  background: getBarColor(f.rawScore),
                }}
              />
            </div>
            <div className="w-10 text-xs text-gray-300 text-right">{f.rawScore}</div>
            <div className="w-8 text-xs text-gray-500">{Math.round(f.weight * 100)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}
