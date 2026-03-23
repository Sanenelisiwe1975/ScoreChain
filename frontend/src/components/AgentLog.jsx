import React, { useEffect, useRef } from 'react';

const STATUS_ICONS = {
  done: '✓',
  error: '✗',
  info: '·',
};

function classifyLog(message) {
  const lower = message.toLowerCase();
  if (lower.includes('error') || lower.includes('failed') || lower.includes('fail')) return 'error';
  if (
    lower.includes('confirmed') ||
    lower.includes('complete') ||
    lower.includes('minted') ||
    lower.includes('calculated') ||
    lower.includes('generated') ||
    lower.includes('submitted') ||
    lower.includes('found') ||
    lower.includes('✓')
  )
    return 'done';
  return 'info';
}

function getLogColor(type) {
  if (type === 'done') return 'text-emerald-400';
  if (type === 'error') return 'text-red-400';
  return 'text-gray-400';
}

export default function AgentLog({ logs, isLoading }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900/80 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-700 bg-gray-900">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/70" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
          <div className="w-3 h-3 rounded-full bg-green-500/70" />
        </div>
        <span className="text-xs text-gray-400 ml-2 font-mono">scorechain-agent</span>
        {isLoading && (
          <span className="ml-auto flex items-center gap-1.5 text-xs text-blue-400">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            running
          </span>
        )}
      </div>

      {/* Log output */}
      <div className="font-mono text-xs p-4 h-64 overflow-y-auto space-y-1 bg-black/40">
        {logs.length === 0 && !isLoading && (
          <p className="text-gray-600 italic">Waiting for analysis to start...</p>
        )}

        {logs.map((log, i) => {
          const type = classifyLog(log.message);
          const icon = STATUS_ICONS[type];
          const color = getLogColor(type);

          return (
            <div key={i} className="flex gap-2 items-start group">
              <span className="text-gray-600 shrink-0 select-none">
                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <span className={`${color} shrink-0`}>{icon}</span>
              <span className={`${color} break-all`}>{log.message}</span>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-2 items-center">
            <span className="text-gray-600">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <span className="text-blue-400 animate-pulse">▋</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
