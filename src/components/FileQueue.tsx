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
      <div className="h-11 px-4 border-b border-outline-variant flex items-center justify-between bg-surface-container-low">
        <div className="flex items-center space-x-2">
          <Film className="w-3.5 h-3.5 text-white" />
          <h2 className="text-xs font-bold text-white uppercase tracking-wider font-display">
            Dosya Kuyruğu
          </h2>
          <span className="px-1.5 py-0.2 rounded bg-white/10 text-white text-[10px] font-mono font-semibold border border-white/20">
            {queue.length}
          </span>
        </div>
        <div className="flex items-center space-x-1.5">
          {queue.length > 0 && (
            <button
              onClick={onClearQueue}
              className="flex items-center space-x-1 px-2 py-1 rounded-md bg-surface-container-high hover:bg-surface-bright text-neutral-400 hover:text-white text-xs transition border border-outline-variant"
              title="Kuyruğu Temizle"
            >
              <Trash2 className="w-3 h-3 text-red-400" />
              <span>Temizle</span>
            </button>
          )}

          <button
            onClick={handleAddClick}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-md bg-white hover:bg-neutral-200 text-black text-xs font-bold shadow-sm transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
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
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-surface-container-high border border-outline-variant flex items-center justify-center text-white flex-shrink-0 mt-0.5">
                      <FileVideo className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Title & Top Action Row */}
                      <div className="flex items-start justify-between gap-1.5">
                        <h4 className="text-xs font-bold text-white break-words line-clamp-2 leading-tight" title={item.fileName}>
                          {item.fileName}
                        </h4>

                        {/* Card Action Buttons */}
                        <div className="flex items-center space-x-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          {item.status === 'waiting' && (
                            <button
                              onClick={() => onStartItem(item.id)}
                              className="p-1 rounded bg-white/10 hover:bg-white text-white hover:text-black transition"
                              title="Kodlamayı Başlat"
                            >
                              <Play className="w-3 h-3 fill-current" />
                            </button>
                          )}
                          {isEncoding && (
                            <>
                              <button
                                onClick={() => onPauseItem(item.id)}
                                className="p-1 rounded bg-surface-container-high hover:bg-neutral-700 text-neutral-300 transition"
                                title="Duraklat"
                              >
                                <Pause className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => onCancelItem(item.id)}
                                className="p-1 rounded bg-danger/20 hover:bg-danger text-danger hover:text-white transition"
                                title="İptal Et"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </>
                          )}
                          {isPaused && (
                            <>
                              <button
                                onClick={() => onResumeItem(item.id)}
                                className="p-1 rounded bg-white/20 hover:bg-white text-white hover:text-black transition"
                                title="Devam Et"
                              >
                                <Play className="w-3 h-3 fill-current" />
                              </button>
                              <button
                                onClick={() => onCancelItem(item.id)}
                                className="p-1 rounded bg-danger/20 hover:bg-danger text-danger hover:text-white transition"
                                title="İptal Et"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </>
                          )}
                          {!isEncoding && !isPaused && (
                            <button
                              onClick={() => onRemoveItem(item.id)}
                              className="p-1 rounded hover:bg-danger/20 text-neutral-400 hover:text-danger transition"
                              title="Kuyruktan Çıkar"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* File Size & Duration Specs */}
                      <div className="flex items-center space-x-2 text-[10px] text-neutral-400 font-mono mt-1">
                        <span>{formatBytes(item.fileSize)}</span>
                        {meta?.duration_formatted && (
                          <span>• ⏱ {meta.duration_formatted}</span>
                        )}
                        {meta?.video_stream && (
                          <span>• {meta.video_stream.width}x{meta.video_stream.height}</span>
                        )}
                      </div>

                      {/* Metadata & Status Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono mt-1.5">
                        {meta && meta.subtitle_streams && meta.subtitle_streams.length > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-white/10 text-white border border-white/20">
                            📝 {meta.subtitle_streams.length} Altyazı
                          </span>
                        )}
                        {meta && meta.font_count > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-white/10 text-white border border-white/20">
                            🔤 {meta.font_count} Font
                          </span>
                        )}
                        {isCompleted && (
                          <span className="px-1.5 py-0.5 rounded bg-white/10 text-white border border-white/30 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Tamamlandı</span>
                          </span>
                        )}
                        {isError && (
                          <span className="px-1.5 py-0.5 rounded bg-danger/20 text-danger border border-danger/30 font-bold flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            <span>Hata</span>
                          </span>
                        )}
                        {isPaused && (
                          <span className="px-1.5 py-0.5 rounded bg-white/10 text-neutral-300 border border-white/20">
                            Duraklatıldı
                          </span>
                        )}
                        {isEncoding && (
                          <span className="px-1.5 py-0.5 rounded bg-white/20 text-white border border-white/40 animate-pulse font-bold">
                            İşleniyor (%{item.progress.percentage.toFixed(1)})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar & Live Telemetry when encoding / paused */}
                  {(isEncoding || isPaused) && (
                    <div className="mt-3 pt-3 border-t border-outline-variant/30 space-y-2.5">
                      {/* Bar & Header */}
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-white font-bold flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                          {isPaused ? 'Duraklatıldı' : 'İşleniyor...'} (%{item.progress.percentage.toFixed(1)})
                        </span>
                        <span className="text-white font-bold bg-white/10 border border-white/20 px-2 py-0.5 rounded flex items-center gap-1">
                          <Clock className="w-3 h-3 text-white" />
                          <span>Geçen Süre: {item.progress.elapsed_formatted || '00:00:00'}</span>
                        </span>
                      </div>

                      <div className="w-full h-2 bg-surface-container-lowest rounded-full overflow-hidden border border-outline-variant/30">
                        <div
                          className="h-full bg-white rounded-full transition-all duration-300 shadow-sm shadow-white/30"
                          style={{ width: `${item.progress.percentage}%` }}
                        />
                      </div>

                      {/* Live Stats Grid */}
                      <div className="grid grid-cols-4 gap-2 text-[10px] font-mono text-on-surface-variant bg-surface-container-lowest p-2 rounded-lg border border-outline-variant/40">
                        <div className="flex items-center space-x-1">
                          <Gauge className="w-3 h-3 text-white" />
                          <span>FPS: <strong className="text-on-surface">{item.progress.fps.toFixed(1)}</strong></span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Zap className="w-3 h-3 text-white" />
                          <span>Hız: <strong className="text-on-surface">{item.progress.speed.toFixed(1)}x</strong></span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-white" />
                          <span>Konum: <strong className="text-on-surface">{item.progress.time_formatted}</strong></span>
                        </div>
                        <div className="flex items-center space-x-1 text-right justify-end">
                          <span>Kalan: <strong className="text-white">{item.progress.eta_formatted}</strong></span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Completed Duration Summary */}
                  {isCompleted && (
                    <div className="mt-3 pt-2.5 border-t border-white/20 flex items-center justify-between text-[11px] font-mono bg-white/5 px-3 py-2 rounded-lg text-white border border-white/20">
                      <span className="flex items-center space-x-1.5 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-white flex-shrink-0" />
                        <span>Kodlama & Upscale Tamamlandı!</span>
                      </span>
                      <span className="flex items-center space-x-1.5 bg-white/10 px-2 py-0.5 rounded border border-white/20">
                        <Clock className="w-3.5 h-3.5 text-neutral-300" />
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
