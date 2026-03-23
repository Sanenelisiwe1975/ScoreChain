import React, { useEffect, useState } from 'react';

const SCORE_MIN = 300;
const SCORE_MAX = 850;

function getScoreColor(score) {
  if (score >= 750) return '#10b981'; // emerald
  if (score >= 700) return '#3b82f6'; // blue
  if (score >= 650) return '#8b5cf6'; // violet
  if (score >= 580) return '#f59e0b'; // amber
  return '#ef4444';                   // red
}

function getRatingLabel(score) {
  if (score >= 750) return 'Excellent';
  if (score >= 700) return 'Very Good';
  if (score >= 650) return 'Good';
  if (score >= 580) return 'Fair';
  return 'Poor';
}

/**
 * SVG arc-based gauge / dial component
 */
export default function ScoreGauge({ score, animated = true }) {
  const [displayScore, setDisplayScore] = useState(SCORE_MIN);

  useEffect(() => {
    if (!animated) {
      setDisplayScore(score);
      return;
    }
    let start = SCORE_MIN;
    const end = score;
    const duration = 1800;
    const step = (end - start) / (duration / 16);
    let current = start;
    const timer = setInterval(() => {
      current = Math.min(current + step, end);
      setDisplayScore(Math.round(current));
      if (current >= end) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [score, animated]);

  const color = getScoreColor(displayScore);
  const rating = getRatingLabel(displayScore);

  // SVG gauge math
  const cx = 150;
  const cy = 140;
  const r = 110;
  const startAngle = -210;
  const endAngle = 30;
  const totalAngle = endAngle - startAngle; // 240 degrees

  const pct = (displayScore - SCORE_MIN) / (SCORE_MAX - SCORE_MIN);
  const angle = startAngle + pct * totalAngle;

  const toRad = (deg) => (deg * Math.PI) / 180;
  const arcX = (deg) => cx + r * Math.cos(toRad(deg));
  const arcY = (deg) => cy + r * Math.sin(toRad(deg));

  const describeArc = (startDeg, endDeg) => {
    const s = { x: arcX(startDeg), y: arcY(startDeg) };
    const e = { x: arcX(endDeg), y: arcY(endDeg) };
    const largeArc = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`;
  };

  // Needle
  const needleX = cx + (r - 10) * Math.cos(toRad(angle));
  const needleY = cy + (r - 10) * Math.sin(toRad(angle));

  return (
    <div className="flex flex-col items-center">
      <svg width="300" height="200" viewBox="0 0 300 200">
        {/* Background track */}
        <path
          d={describeArc(startAngle, endAngle)}
          fill="none"
          stroke="#1e2942"
          strokeWidth="18"
          strokeLinecap="round"
        />
        {/* Colored progress arc */}
        {displayScore > SCORE_MIN && (
          <path
            d={describeArc(startAngle, angle)}
            fill="none"
            stroke={color}
            strokeWidth="18"
            strokeLinecap="round"
            style={{ transition: 'stroke 0.3s ease' }}
          />
        )}
        {/* Needle */}
        <line
          x1={cx}
          y1={cy}
          x2={needleX}
          y2={needleY}
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          style={{ transition: 'all 0.05s linear' }}
        />
        {/* Center dot */}
        <circle cx={cx} cy={cy} r="8" fill={color} />
        <circle cx={cx} cy={cy} r="4" fill="#0a0e1a" />

        {/* Score labels */}
        <text x="40" y="168" fill="#4b5563" fontSize="11" textAnchor="middle">300</text>
        <text x="260" y="168" fill="#4b5563" fontSize="11" textAnchor="middle">850</text>

        {/* Score display */}
        <text x={cx} y={cy + 35} fill={color} fontSize="42" fontWeight="bold" textAnchor="middle"
          style={{ fontFamily: 'monospace', transition: 'fill 0.3s ease' }}>
          {displayScore}
        </text>
        <text x={cx} y={cy + 55} fill={color} fontSize="14" textAnchor="middle"
          style={{ transition: 'fill 0.3s ease' }}>
          {rating}
        </text>
      </svg>

      {/* Score range labels */}
      <div className="flex gap-2 mt-1 flex-wrap justify-center">
        {[
          { label: 'Poor', color: '#ef4444', range: '300–499' },
          { label: 'Fair', color: '#f59e0b', range: '500–579' },
          { label: 'Good', color: '#8b5cf6', range: '580–649' },
          { label: 'Very Good', color: '#3b82f6', range: '650–749' },
          { label: 'Excellent', color: '#10b981', range: '750–850' },
        ].map((item) => (
          <span key={item.label} className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: item.color + '20', color: item.color, border: `1px solid ${item.color}40` }}>
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
