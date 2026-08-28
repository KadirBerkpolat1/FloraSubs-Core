import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Copy, Trash2, Check, ArrowDownCircle, Search } from 'lucide-react';
import { JobLogMessage } from '../types';

interface ConsoleViewProps {
  logs: JobLogMessage[];
  onClearLogs: () => void;
}

export const ConsoleView: React.FC<ConsoleViewProps> = ({ logs, onClearLogs }) => {
  const [filterStream, setFilterStream] = useState<'all' | 'system' | 'stderr' | 'stdout'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter((log) => {
    if (filterStream !== 'all' && log.stream !== filterStream) return false;
    if (searchQuery && !log.line.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleCopyLogs = () => {
    const text = logs.map((l) => `[${l.timestamp}] [${l.stream.toUpperCase()}] ${l.line}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 bg-surface-container-lowest flex flex-col h-full overflow-hidden select-none">
      {/* Console Top Toolbar */}
      <div className="h-14 px-6 border-b border-outline-variant bg-surface-container flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Terminal className="w-4 h-4 text-white" />
          <h2 className="text-xs font-bold text-white uppercase tracking-wide">
            FFmpeg Canlı Terminal Konsolu
          </h2>
          <span className="px-2 py-0.5 rounded-full bg-white/10 text-white text-xs font-mono font-semibold border border-white/20">
            {logs.length} Satır
          </span>
        </div>

        <div className="flex items-center space-x-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Loglarda ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-surface-container-lowest text-white text-xs pl-8 pr-3 py-1.5 rounded-lg border border-outline-variant focus:outline-none focus:border-white font-mono w-44"
            />
          </div>

          {/* Stream Filter */}
          <select
            value={filterStream}
            onChange={(e) => setFilterStream(e.target.value as 'all' | 'system' | 'stderr' | 'stdout')}
            className="bg-surface-container-lowest text-white text-xs px-3 py-1.5 rounded-lg border border-outline-variant focus:outline-none focus:border-white font-mono"
          >
            <option value="all">Tüm Akışlar</option>
            <option value="system">Sistem ([FloraSubs])</option>
            <option value="stderr">FFmpeg Stderr</option>
            <option value="stdout">FFmpeg Stdout</option>
          </select>

          {/* Auto Scroll Toggle */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`p-1.5 rounded-lg border text-xs transition flex items-center space-x-1 ${
              autoScroll
                ? 'bg-white text-black border-white'
                : 'bg-surface-container-high border-outline-variant text-neutral-400'
            }`}
            title="Otomatik Kaydırma"
          >
            <ArrowDownCircle className="w-4 h-4" />
          </button>

          {/* Copy Button */}
          <button
            onClick={handleCopyLogs}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-neutral-700 text-neutral-200 text-xs font-medium border border-outline-variant transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5 text-neutral-400" />}
            <span>{copied ? 'Kopyalandı' : 'Kopyala'}</span>
          </button>

          {/* Clear Button */}
          <button
            onClick={onClearLogs}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-danger/20 text-danger text-xs font-medium border border-outline-variant transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Temizle</span>
          </button>
        </div>
      </div>

      {/* Terminal Viewport */}
      <div
        ref={logContainerRef}
        className="flex-1 p-4 font-mono text-xs overflow-y-auto bg-surface-container-lowest select-text space-y-1"
      >
        {filteredLogs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-neutral-500 space-y-2 select-none">
            <Terminal className="w-8 h-8 opacity-40 text-white" />
            <p>Konsol çıktısı bekleniyor. Kodlama başladığında loglar burada canlı akacaktır.</p>
          </div>
        ) : (
          filteredLogs.map((log, idx) => {
            const isSystem = log.stream === 'system';
            const isError = log.line.toLowerCase().includes('error') || log.line.toLowerCase().includes('fatal');
            const isWarning = log.line.toLowerCase().includes('warning');

            let textColor = 'text-neutral-300';
            if (isSystem) textColor = 'text-white font-bold';
            else if (isError) textColor = 'text-danger font-semibold';
            else if (isWarning) textColor = 'text-neutral-200';

            return (
              <div key={idx} className="flex items-start space-x-3 leading-relaxed hover:bg-white/5 px-2 py-0.5 rounded">
                <span className="text-neutral-500 flex-shrink-0 text-[11px] select-none">{log.timestamp}</span>
                <span className={`flex-shrink-0 text-[10px] px-1 rounded uppercase select-none ${
                  isSystem
                    ? 'bg-white/15 text-white border border-white/20'
                    : log.stream === 'stderr'
                    ? 'bg-surface-container-high text-neutral-300 border border-outline-variant'
                    : 'bg-surface-container-highest text-neutral-400 border border-outline-variant'
                }`}>
                  {log.stream}
                </span>
                <span className={`flex-1 break-all ${textColor}`}>{log.line}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
