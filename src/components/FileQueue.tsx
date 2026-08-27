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
    <div className="flex-1 bg-surface-container-low flex flex-col h-full overflow-hidden select-none">
      {/* Header */}
      <div className="h-14 px-6 border-b border-outline-variant flex items-center justify-between bg-surface-container-low">
        <div className="flex items-center space-x-3">
          <Film className="w-4 h-4 text-primary" />
          <h2 className="text-xs font-bold text-on-surface uppercase tracking-wider font-display">
            MKV / MP4 Dosyaları
          </h2>
          <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-xs font-mono font-semibold border border-primary/30">
            {queue.length}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          {queue.length > 0 && (
            <button
              onClick={onClearQueue}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface-variant text-xs transition border border-outline-variant"
              title="Kuyruğu Temizle"
            >
              <Trash2 className="w-3.5 h-3.5 text-danger" />
              <span>Temizle</span>
            </button>
          )}

          <button
            onClick={handleAddClick}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-container text-surface-container-lowest text-xs font-bold shadow-md shadow-primary/20 transition cursor-pointer"
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
        className={`flex-1 p-4 overflow-y-auto ${
          isDragOver ? 'bg-primary/5 border-2 border-dashed border-primary/50 m-2 rounded-2xl' : ''
        }`}
      >
        {queue.length === 0 ? (
          // Empty State Dropzone
          <div
            onClick={handleAddClick}
            className="h-full border-2 border-dashed border-outline-variant/60 hover:border-primary/50 rounded-2xl flex flex-col items-center justify-center space-y-4 p-8 transition-all cursor-pointer group bg-surface-container/30 hover:bg-surface-container/60"
          >
            <div className="w-20 h-20 rounded-2xl bg-surface-container-high group-hover:bg-primary/20 group-hover:border-primary/40 border border-outline-variant flex items-center justify-center text-on-surface-variant group-hover:text-primary transition transform group-hover:scale-105 shadow-xl">
              <Plus className="w-10 h-10" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-sm font-bold text-on-surface group-hover:text-primary transition">
                Video Dosyalarını Buraya Sürükleyin
              </h3>
              <p className="text-xs text-on-surface-variant max-w-[240px]">
                MKV, MP4, WebM, TS veya AVI dosyalarını toplu içe aktarın.
              </p>
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
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-surface-container border-primary shadow-lg shadow-primary/10'
                      : 'bg-surface-container-lowest/80 border-outline-variant/40 hover:bg-surface-container hover:border-outline-variant'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1 min-w-0 pr-2">
                      <div className="w-9 h-9 rounded-lg bg-surface-container-high border border-outline-variant flex items-center justify-center text-primary flex-shrink-0">
                        <FileVideo className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-xs font-bold text-on-surface truncate" title={item.fileName}>
                            {item.fileName}
                          </h4>
                          <span className="text-[10px] text-on-surface-variant font-mono">
                            ({formatBytes(item.fileSize)})
                          </span>
                        </div>

                        {/* Metadata Tags */}
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                          {meta?.duration_formatted && (
                            <span className="px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant border border-outline-variant/50">
                              ⏱ {meta.duration_formatted}
                            </span>
                          )}
                          {meta?.video_stream && (
                            <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                              {meta.video_stream.width}x{meta.video_stream.height} ({meta.video_stream.fps.toFixed(1)} fps)
                            </span>
                          )}
                          {meta && meta.subtitle_streams.length > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-secondary/10 text-secondary border border-secondary/20">
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
                        <span className="px-2.5 py-1 rounded-full bg-primary/20 text-primary text-[11px] font-bold border border-primary/30 flex items-center space-x-1 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
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
                        <span className="px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant text-[11px] font-medium border border-outline-variant/40">
                          Bekliyor
                        </span>
                      )}

                      {/* Card Action Buttons */}
                      <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                        {item.status === 'waiting' && (
                          <button
                            onClick={() => onStartItem(item.id)}
                            className="p-1.5 rounded-lg bg-primary/20 hover:bg-primary text-primary hover:text-surface-container-lowest transition font-bold"
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
                              className="p-1.5 rounded-lg bg-primary/20 hover:bg-primary text-primary hover:text-surface-container-lowest transition"
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
                            className="p-1.5 rounded-lg bg-surface-container-high hover:bg-rose-600/30 text-on-surface-variant hover:text-danger transition"
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
                    <div className="mt-3 pt-3 border-t border-outline-variant/30 space-y-2.5">
                      {/* Bar & Header */}
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-primary font-bold flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                          {isPaused ? 'Duraklatıldı' : 'İşleniyor...'} (%{item.progress.percentage.toFixed(1)})
                        </span>
                        <span className="text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded flex items-center gap-1">
                          <Clock className="w-3 h-3 text-emerald-400" />
                          <span>Geçen Süre: {item.progress.elapsed_formatted || '00:00:00'}</span>
                        </span>
                      </div>

                      <div className="w-full h-2 bg-surface-container-lowest rounded-full overflow-hidden border border-outline-variant/30">
                        <div
                          className="h-full bg-gradient-to-r from-primary via-orange to-emerald-400 rounded-full transition-all duration-300 shadow-sm shadow-primary/30"
                          style={{ width: `${item.progress.percentage}%` }}
                        />
                      </div>

                      {/* Live Stats Grid */}
                      <div className="grid grid-cols-4 gap-2 text-[10px] font-mono text-on-surface-variant bg-surface-container-lowest p-2 rounded-lg border border-outline-variant/40">
                        <div className="flex items-center space-x-1">
                          <Gauge className="w-3 h-3 text-primary" />
                          <span>FPS: <strong className="text-on-surface">{item.progress.fps.toFixed(1)}</strong></span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Zap className="w-3 h-3 text-orange" />
                          <span>Hız: <strong className="text-on-surface">{item.progress.speed.toFixed(1)}x</strong></span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-secondary" />
                          <span>Konum: <strong className="text-on-surface">{item.progress.time_formatted}</strong></span>
                        </div>
                        <div className="flex items-center space-x-1 text-right justify-end">
                          <span>Kalan: <strong className="text-primary">{item.progress.eta_formatted}</strong></span>
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
