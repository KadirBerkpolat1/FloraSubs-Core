import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Play,
  Pause,
  X,
  FileVideo,
  CheckCircle2,
  AlertCircle,
  Clock,
  Zap,
  Gauge,
  Film,
} from 'lucide-react';
import { QueueItem } from '../types';
interface FileQueueProps {
  queue: QueueItem[];
  selectedId: string | null;
  onSelect: (item: QueueItem) => void;
  onAddFiles: () => void;
  onRemoveItem: (id: string) => void;
  onClearQueue: () => void;
  onStartItem: (id: string) => void;
  onPauseItem: (id: string) => void;
  onResumeItem: (id: string) => void;
  onCancelItem: (id: string) => void;
}

export const FileQueue: React.FC<FileQueueProps> = ({
  queue,
  selectedId,
  onSelect,
  onAddFiles,
  onRemoveItem,
  onClearQueue,
  onStartItem,
  onPauseItem,
  onResumeItem,
  onCancelItem,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleAddClick = () => {
    onAddFiles();
  };


  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <div className="flex-1 bg-[#0f1117] flex flex-col h-full overflow-hidden select-none">
      {/* Header */}
      <div className="h-14 px-6 border-b border-[#242938] flex items-center justify-between bg-[#131722]">
        <div className="flex items-center space-x-3">
          <Film className="w-4 h-4 text-blue-400" />
          <h2 className="text-xs font-bold text-gray-200 uppercase tracking-wide">
            MKV / MP4 Dosyaları
          </h2>
          <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-mono font-semibold border border-blue-500/30">
            {queue.length}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          {queue.length > 0 && (
            <button
              onClick={onClearQueue}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-[#1f2433] hover:bg-[#2a3145] text-gray-300 text-xs transition border border-[#2e364a]"
              title="Kuyruğu Temizle"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Temizle</span>
            </button>
          )}


          <button
            onClick={handleAddClick}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Dosya Ekle</span>
          </button>
        </div>
      </div>

      {/* Main Body: Dropzone or Queue List */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          // Tauri native drag-drop (tauri://drag-drop in App) delivers real filesystem paths;
          // HTML5 dataTransfer paths are unavailable in the webview.
          e.preventDefault();
          setIsDragOver(false);
        }}
        className={`flex-1 p-6 overflow-y-auto ${
          isDragOver ? 'bg-blue-500/5 border-2 border-dashed border-blue-500/50 m-2 rounded-2xl' : ''
        }`}
      >
        {queue.length === 0 ? (
          // Empty State Dropzone (Screenshot #4 Style)
          <div
            onClick={handleAddClick}
            className="h-full border-2 border-dashed border-[#242938] hover:border-blue-500/50 rounded-2xl flex flex-col items-center justify-center space-y-4 p-8 transition-all cursor-pointer group bg-[#131722]/50 hover:bg-[#161c2b]/50"
          >
            <div className="w-20 h-20 rounded-2xl bg-[#1b2130] group-hover:bg-blue-600/20 group-hover:border-blue-500/40 border border-[#2e364a] flex items-center justify-center text-gray-400 group-hover:text-blue-400 transition transform group-hover:scale-105 shadow-xl">
              <Plus className="w-10 h-10" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-sm font-bold text-gray-200 group-hover:text-white">
                Video Dosyalarını Buraya Sürükleyin
              </h3>
              <p className="text-xs text-gray-400 max-w-sm">
                MKV, MP4, TS, WebM veya AVI dosyalarını doğrudan sürükleyip bırakın veya seçmek için tıklayın.
              </p>
            </div>

            <div className="flex items-center space-x-2 text-[11px] text-gray-400 font-mono bg-[#1c2232] px-3 py-1 rounded-full border border-[#2a334a]">
              <span>MKV</span>
              <span>•</span>
              <span>MP4</span>
              <span>•</span>
              <span>WebM</span>
              <span>•</span>
              <span>TS</span>
              <span>•</span>
              <span>ASS Altyazı</span>
            </div>
          </div>
        ) : (
          // Queue List Cards
          <div className="space-y-3">
            {queue.map((item) => {
              const isSelected = selectedId === item.id;
              const isEncoding = item.status === 'encoding';
              const isPaused = item.status === 'paused';
              const isCompleted = item.status === 'completed';
              const isError = item.status === 'error';
              const meta = item.metadata;

              return (
                <div
                  key={item.id}
                  onClick={() => onSelect(item)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#181e2b] border-blue-500/60 shadow-lg shadow-blue-500/10'
                      : 'bg-[#141824] border-[#22283a] hover:bg-[#191f2e] hover:border-[#2d354d]'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1 min-w-0 pr-4">
                      <div className="w-10 h-10 rounded-lg bg-[#1e2538] border border-[#2f3955] flex items-center justify-center text-blue-400 flex-shrink-0">
                        <FileVideo className="w-5 h-5" />
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-xs font-bold text-gray-200 truncate" title={item.fileName}>
                            {item.fileName}
                          </h4>
                          <span className="text-[10px] text-gray-400 font-mono">
                            ({formatBytes(item.fileSize)})
                          </span>
                        </div>

                        {/* Metadata Tags */}
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                          {meta?.duration_formatted && (
                            <span className="px-1.5 py-0.5 rounded bg-[#1f2638] text-gray-300 border border-[#2e374f]">
                              ⏱ {meta.duration_formatted}
                            </span>
                          )}
                          {meta?.video_stream && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              {meta.video_stream.width}x{meta.video_stream.height} ({meta.video_stream.fps.toFixed(1)} fps)
                            </span>
                          )}
                          {meta && meta.subtitle_streams.length > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                              📝 {meta.subtitle_streams.length} Altyazı
                            </span>
                          )}
                          {meta && meta.font_count > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              🔤 {meta.font_count} Font
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status Badge & Actions */}
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      {/* Status Badge */}
                      {isEncoding && (
                        <span className="px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-400 text-[11px] font-bold border border-blue-500/30 flex items-center space-x-1 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                          <span>İşleniyor (%{item.progress.percentage.toFixed(1)})</span>
                        </span>
                      )}
                      {isPaused && (
                        <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 text-[11px] font-bold border border-amber-500/30">
                          Duraklatıldı
                        </span>
                      )}
                      {isCompleted && (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-bold border border-emerald-500/30 flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Tamamlandı ({item.progress.elapsed_formatted || item.progress.time_formatted})</span>
                        </span>
                      )}
                      {isError && (
                        <span className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-400 text-[11px] font-bold border border-rose-500/30 flex items-center space-x-1">
                          <AlertCircle className="w-3 h-3" />
                          <span>Hata</span>
                        </span>
                      )}
                      {item.status === 'waiting' && (
                        <span className="px-2.5 py-1 rounded-full bg-gray-500/20 text-gray-400 text-[11px] font-medium border border-gray-500/30">
                          Bekliyor
                        </span>
                      )}

                      {/* Card Action Buttons */}
                      <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                        {item.status === 'waiting' && (
                          <button
                            onClick={() => onStartItem(item.id)}
                            className="p-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white transition"
                            title="Kodlamayı Başlat"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {isEncoding && (
                          <>
                            <button
                              onClick={() => onPauseItem(item.id)}
                              className="p-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600 text-amber-400 hover:text-white transition"
                              title="Duraklat"
                            >
                              <Pause className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onCancelItem(item.id)}
                              className="p-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white transition"
                              title="İptal Et"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        {isPaused && (
                          <>
                            <button
                              onClick={() => onResumeItem(item.id)}
                              className="p-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white transition"
                              title="Devam Et"
                            >
                              <Play className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onCancelItem(item.id)}
                              className="p-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white transition"
                              title="İptal Et"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        {!isEncoding && !isPaused && (
                          <button
                            onClick={() => onRemoveItem(item.id)}
                            className="p-1.5 rounded-lg bg-[#242b3d] hover:bg-rose-600/30 text-gray-400 hover:text-rose-400 transition"
                            title="Kuyruktan Çıkar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar & Live Telemetry when encoding / paused */}
                  {(isEncoding || isPaused) && (
                    <div className="mt-3 pt-3 border-t border-[#262c3e] space-y-2.5">
                      {/* Bar & Header */}
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-blue-400 font-bold flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                          {isPaused ? 'Duraklatıldı' : 'İşleniyor...'} (%{item.progress.percentage.toFixed(1)})
                        </span>
                        <span className="text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded flex items-center gap-1">
                          <Clock className="w-3 h-3 text-emerald-400" />
                          <span>Geçen Süre: {item.progress.elapsed_formatted || '00:00:00'}</span>
                        </span>
                      </div>

                      <div className="w-full h-2 bg-[#1f2638] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 rounded-full transition-all duration-300 shadow-sm shadow-blue-500/50"
                          style={{ width: `${item.progress.percentage}%` }}
                        />
                      </div>

                      {/* Live Stats Grid */}
                      <div className="grid grid-cols-4 gap-2 text-[10px] font-mono text-gray-400 bg-[#161c2b] p-2 rounded-lg border border-[#232b40]">
                        <div className="flex items-center space-x-1">
                          <Gauge className="w-3 h-3 text-blue-400" />
                          <span>FPS: <strong className="text-white">{item.progress.fps.toFixed(1)}</strong></span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Zap className="w-3 h-3 text-amber-400" />
                          <span>Hız: <strong className="text-white">{item.progress.speed.toFixed(1)}x</strong></span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-cyan-400" />
                          <span>Konum: <strong className="text-white">{item.progress.time_formatted}</strong></span>
                        </div>
                        <div className="flex items-center space-x-1 text-right justify-end">
                          <span>Kalan: <strong className="text-amber-300">{item.progress.eta_formatted}</strong></span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Completed Duration Summary */}
                  {isCompleted && (
                    <div className="mt-3 pt-2.5 border-t border-emerald-500/20 flex items-center justify-between text-[11px] font-mono bg-emerald-950/20 px-3 py-2 rounded-lg text-emerald-400 border border-emerald-500/30">
                      <span className="flex items-center space-x-1.5 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        <span>Kodlama & Upscale Tamamlandı!</span>
                      </span>
                      <span className="flex items-center space-x-1.5 bg-emerald-900/40 px-2 py-0.5 rounded border border-emerald-500/20">
                        <Clock className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Toplam Süre: <strong className="text-white font-bold">{item.progress.elapsed_formatted || item.progress.time_formatted}</strong></span>
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
