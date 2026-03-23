import React, { useEffect, useState } from 'react';

const SCORE_MIN = 300;
const SCORE_MAX = 850;

const TIERS = [
  { label: 'Poor',      min: 300, max: 499, color: '#ef4444' },
  { label: 'Fair',      min: 500, max: 579, color: '#f59e0b' },
  { label: 'Good',      min: 580, max: 649, color: '#8b5cf6' },
  { label: 'Very Good', min: 650, max: 749, color: '#3b82f6' },
  { label: 'Excellent', min: 750, max: 850, color: '#10b981' },
];

function getScoreColor(score) {
  return TIERS.find(t => score <= t.max)?.color ?? '#10b981';
}

function getRatingLabel(score) {
  return TIERS.find(t => score <= t.max)?.label ?? 'Excellent';
}

export default function ScoreGauge({ score, animated = true }) {
  const [display, setDisplay] = useState(SCORE_MIN);

  useEffect(() => {
    if (!animated) { setDisplay(score); return; }
    let current = SCORE_MIN;
    const step = (score - SCORE_MIN) / (1800 / 16);
    const timer = setInterval(() => {
      current = Math.min(current + step, score);
      setDisplay(Math.round(current));
      if (current >= score) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [score, animated]);

  const color = getScoreColor(display);
  const rating = getRatingLabel(display);

  // SVG arc geometry — 240° sweep
  const cx = 160, cy = 150, r = 120;
  const startAngle = -210;
  const totalAngle = 240;
  const pct = (display - SCORE_MIN) / (SCORE_MAX - SCORE_MIN);
  const angle = startAngle + pct * totalAngle;

  const toRad = d => (d * Math.PI) / 180;
  const pt = deg => ({ x: cx + r * Math.cos(toRad(deg)), y: cy + r * Math.sin(toRad(deg)) });

  const arc = (a1, a2) => {
    const s = pt(a1), e = pt(a2);
    const large = a2 - a1 > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
  };

  const needle = pt(angle);
  const glowId = `glow-${color.replace('#', '')}`;

  return (
    <div className="flex flex-col items-center w-full">
      <svg width="320" height="210" viewBox="0 0 320 210" className="overflow-visible">
        <defs>
          <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="needleGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Track background */}
        <path d={arc(startAngle, startAngle + totalAngle)}
          fill="none" stroke="#1a2035" strokeWidth="20" strokeLinecap="round" />

        {/* Subtle tick marks */}
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
          const a = startAngle + p * totalAngle;
          const inner = { x: cx + (r - 14) * Math.cos(toRad(a)), y: cy + (r - 14) * Math.sin(toRad(a)) };
          const outer = { x: cx + (r + 14) * Math.cos(toRad(a)), y: cy + (r + 14) * Math.sin(toRad(a)) };
          return <line key={i} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
            stroke="#2a3555" strokeWidth="1.5" />;
        })}

        {/* Colored progress arc */}
        {display > SCORE_MIN && (
          <path d={arc(startAngle, angle)}
            fill="none" stroke={color} strokeWidth="20" strokeLinecap="round"
            filter={`url(#${glowId})`}
            style={{ transition: 'stroke 0.4s ease' }} />
        )}

        {/* Needle */}
        <line x1={cx} y1={cy} x2={needle.x} y2={needle.y}
          stroke={color} strokeWidth="2.5" strokeLinecap="round"
          filter="url(#needleGlow)"
          style={{ transition: 'all 0.05s linear' }} />

        {/* Center hub */}
        <circle cx={cx} cy={cy} r={10} fill={color} opacity="0.3" />
        <circle cx={cx} cy={cy} r={7} fill={color} />
        <circle cx={cx} cy={cy} r={3.5} fill="#0a0e1a" />

        {/* Min / max labels */}
        <text x="30" y="178" fill="#374151" fontSize="11" textAnchor="middle" fontFamily="monospace">300</text>
        <text x="290" y="178" fill="#374151" fontSize="11" textAnchor="middle" fontFamily="monospace">850</text>

        {/* Score number */}
        <text x={cx} y={cy + 42} fill={color} fontSize="52" fontWeight="700"
          textAnchor="middle" fontFamily="monospace"
          style={{ transition: 'fill 0.4s ease', filter: `drop-shadow(0 0 12px ${color}60)` }}>
          {display}
        </text>

        {/* Rating label */}
        <text x={cx} y={cy + 62} fill={color} fontSize="13" fontWeight="500"
          textAnchor="middle" opacity="0.85"
          style={{ transition: 'fill 0.4s ease' }}>
          {rating}
        </text>
      </svg>

      {/* Score tier legend */}
      <div className="flex gap-1.5 mt-2 flex-wrap justify-center">
        {TIERS.map(({ label, color: c }) => (
          <span key={label}
            className="text-xs px-2.5 py-0.5 rounded-full font-medium transition-all"
            style={{
              background: `${c}18`,
              color: c,
              border: `1px solid ${c}35`,
              opacity: getRatingLabel(display) === label ? 1 : 0.4,
              transform: getRatingLabel(display) === label ? 'scale(1.05)' : 'scale(1)',
            }}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
