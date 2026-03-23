import React, { useEffect, useRef } from 'react';

function classify(msg) {
  const m = msg.toLowerCase();
  if (m.includes('error') || m.includes('failed') || m.includes('fail')) return 'error';
  if (m.includes('warning')) return 'warn';
  if (
    m.includes('confirmed') || m.includes('complete') || m.includes('minted') ||
    m.includes('calculated') || m.includes('generated') || m.includes('submitted') ||
    m.includes('✓') || m.includes('found') || m.includes('ready')
  ) return 'success';
  if (m.includes('querying') || m.includes('fetching') || m.includes('running') ||
      m.includes('connecting') || m.includes('starting') || m.includes('analyzing') ||
      m.includes('submitting') || m.includes('minting') || m.includes('generating'))
    return 'active';
  return 'info';
}

const STYLES = {
  success: { dot: 'bg-emerald-400', text: 'text-emerald-300', prefix: '✓' },
  error:   { dot: 'bg-red-400',     text: 'text-red-300',     prefix: '✗' },
  warn:    { dot: 'bg-amber-400',   text: 'text-amber-300',   prefix: '!' },
  active:  { dot: 'bg-blue-400 animate-pulse', text: 'text-blue-300', prefix: '›' },
  info:    { dot: 'bg-gray-600',    text: 'text-gray-400',    prefix: '·' },
};

export default function AgentLog({ logs, isLoading }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-950 overflow-hidden shadow-xl shadow-black/40">
      {/* Terminal title bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-800/80 bg-gray-900/80">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/60" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
          <div className="w-3 h-3 rounded-full bg-green-500/60" />
        </div>
        <span className="text-xs text-gray-500 font-mono ml-2 flex-1">scorechain-agent</span>
        {isLoading && (
          <span className="flex items-center gap-1.5 text-xs text-blue-400">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            running
          </span>
        )}
        {!isLoading && logs.length > 0 && (
          <span className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
            idle
          </span>
        )}
      </div>

      {/* Log output */}
      <div className="font-mono text-xs p-4 h-72 overflow-y-auto space-y-1.5">
        {logs.length === 0 && !isLoading && (
          <p className="text-gray-700 italic">Waiting for analysis to start...</p>
        )}

        {logs.map((log, i) => {
          const type = classify(log.message);
          const { dot, text, prefix } = STYLES[type];
          const time = new Date(log.timestamp).toLocaleTimeString([], {
            hour: '2-digit', minute: '2-digit', second: '2-digit',
          });

          return (
            <div key={i} className="flex gap-2 items-start">
              <span className="text-gray-700 shrink-0 tabular-nums">{time}</span>
              <span className={`shrink-0 ${text} w-3 text-center`}>{prefix}</span>
              <span className={`${text} leading-relaxed break-all`}>{log.message}</span>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-2 items-center mt-1">
            <span className="text-gray-700 tabular-nums">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <span className="text-blue-400 animate-pulse text-sm">▋</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Stats footer */}
      {logs.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-800/80 bg-gray-900/40 flex items-center gap-4">
          <span className="text-xs text-gray-600">{logs.length} events</span>
          {logs.filter(l => classify(l.message) === 'error').length > 0 && (
            <span className="text-xs text-red-500">
              {logs.filter(l => classify(l.message) === 'error').length} error(s)
            </span>
          )}
          {logs.filter(l => classify(l.message) === 'success').length > 0 && (
            <span className="text-xs text-emerald-600">
              {logs.filter(l => classify(l.message) === 'success').length} completed
            </span>
          )}
        </div>
      )}
    </div>
  );
}
