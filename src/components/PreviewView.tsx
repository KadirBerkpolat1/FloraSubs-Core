import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  RotateCcw,
  RotateCw,
  Layers,
  Eye,
  Film,
  ChevronLeft,
  ChevronRight,
  FileText,
} from 'lucide-react';
import { EncodeJobConfig, QueueItem, SubtitleDialogue } from '../types';
import {
  convertMediaSrc,
  getPreviewSubtitles,
  getVideoStreamUrl,
  selectSubtitleFile,
} from '../services/tauri';

interface PreviewViewProps {
  selectedItem: QueueItem | null;
  config: EncodeJobConfig;
}

export const PreviewView: React.FC<PreviewViewProps> = ({ selectedItem, config }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [streamUrl, setStreamUrl] = useState<string>('');
  const [videoError, setVideoError] = useState<string | null>(null);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);
  const [hoverPosition, setHoverPosition] = useState<{ percent: number; time: number; x: number } | null>(null);
  // Subtitle synchronization state
  const [subtitleDialogues, setSubtitleDialogues] = useState<SubtitleDialogue[]>([]);
  const [activeSubTrack, setActiveSubTrack] = useState<string>('0');
  const [currentCueText, setCurrentCueText] = useState<string | null>(null);
  const [previewExternalSubPath, setPreviewExternalSubPath] = useState<string | null>(null);
  const [loadingSubs, setLoadingSubs] = useState<boolean>(false);

  const meta = selectedItem?.metadata;
  const activeFilePath = selectedItem?.filePath || '';
  useEffect(() => {
    if (meta && meta.subtitle_streams && meta.subtitle_streams.length > 0) {
      setActiveSubTrack(meta.subtitle_streams[0].subtitle_index.toString());
    } else if (previewExternalSubPath || config.external_subtitle_path) {
      setActiveSubTrack('external');
    } else {
      setActiveSubTrack('none');
    }
  }, [selectedItem?.id, meta?.subtitle_streams?.length, previewExternalSubPath, config.external_subtitle_path]);

  // Load video stream URL
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setStreamUrl('');
    setVideoError(null);
    setCurrentCueText(null);
    if (meta?.duration_secs && meta.duration_secs > 0) {
      setDuration(meta.duration_secs);
    }

    if (activeFilePath) {
      getVideoStreamUrl(activeFilePath)
        .then((url) => setStreamUrl(url))
        .catch((err) => {
          console.warn('Stream URL hatası:', err);
          setStreamUrl(convertMediaSrc(activeFilePath));
        });
    }
    const isExternal = activeSubTrack === 'external';
    if (activeSubTrack === 'none' || (!isExternal && meta && meta.subtitle_streams && meta.subtitle_streams.length === 0)) {
      setSubtitleDialogues([]);
      setLoadingSubs(false);
      return;
    }

    setLoadingSubs(true);
    const subIdx = isExternal ? 0 : parseInt(activeSubTrack, 10) || 0;
    const targetFile = isExternal
      ? previewExternalSubPath || config.external_subtitle_path || activeFilePath
      : activeFilePath;
    getPreviewSubtitles(targetFile, subIdx, isExternal)
      .then((cues) => {
        setSubtitleDialogues(cues);
      })
      .catch((err) => {
        console.warn('Altyazı ayrıştırma uyarısı:', err);
        setSubtitleDialogues([]);
      })
      .finally(() => {
        setLoadingSubs(false);
      });
  }, [
    selectedItem?.id,
    activeFilePath,
    activeSubTrack,
    config.external_subtitle_path,
    previewExternalSubPath,
  ]);

  const handleLoadExternalSub = async () => {
    const subPath = await selectSubtitleFile();
    if (subPath) {
      setPreviewExternalSubPath(subPath);
      setActiveSubTrack('external');
    }
  };
  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        console.warn('Video oynatma bildirimi:', err);
      });
    } else {
      v.pause();
    }
  };

  // Global keyboard shortcuts for desktop media control
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName;
      if (targetTag === 'INPUT' || targetTag === 'SELECT' || targetTag === 'TEXTAREA') {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        skipTime(-5);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        skipTime(5);
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        setVolume((v) => {
          const nextVol = Math.min(1, parseFloat((v + 0.1).toFixed(2)));
          if (videoRef.current) videoRef.current.volume = nextVol;
          return nextVol;
        });
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        setVolume((v) => {
          const nextVol = Math.max(0, parseFloat((v - 0.1).toFixed(2)));
          if (videoRef.current) videoRef.current.volume = nextVol;
          return nextVol;
        });
      } else if (e.code === 'KeyM') {
        toggleMute();
      } else if (e.code === 'KeyF') {
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [duration, isMuted, volume]);

  // Synchronize subtitle cues on every time update (ignore while dragging scrubber)
  const handleTimeUpdate = () => {
    if (!videoRef.current || isScrubbing) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);

    if (subtitleDialogues.length > 0 && activeSubTrack !== 'none') {
      const match = subtitleDialogues.find((cue) => time >= cue.start && time <= cue.end);
      setCurrentCueText(match ? match.text : null);
    } else {
      setCurrentCueText(null);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const vDur = videoRef.current.duration;
      if (Number.isFinite(vDur) && vDur > 0) {
        setDuration(vDur);
      } else if (meta?.duration_secs && meta.duration_secs > 0) {
        setDuration(meta.duration_secs);
      }
      setVideoError(null);
    }
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
  };

  const handleSeekStart = () => {
    setIsScrubbing(true);
  };

  const handleSeekCommit = (
    e:
      | React.MouseEvent<HTMLInputElement>
      | React.TouchEvent<HTMLInputElement>
      | React.SyntheticEvent<HTMLInputElement>
  ) => {
    const target = e.currentTarget as HTMLInputElement;
    const time = parseFloat(target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
    setIsScrubbing(false);
  };


  const handleProgressBarMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || duration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const offsetX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percent = (offsetX / rect.width) * 100;
    const time = (offsetX / rect.width) * duration;
    setHoverPosition({ percent, time, x: offsetX });
  };

  const handleProgressBarMouseLeave = () => {
    setHoverPosition(null);
  };
  // Safety listener for mouse up outside the scrubber
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isScrubbing) {
        setIsScrubbing(false);
        if (videoRef.current) {
          videoRef.current.currentTime = currentTime;
        }
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('touchend', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, [isScrubbing, currentTime]);

  const skipTime = (seconds: number) => {
    if (videoRef.current) {
      const nextTime = Math.min(Math.max(0, videoRef.current.currentTime + seconds), duration);
      videoRef.current.currentTime = nextTime;
      setCurrentTime(nextTime);
    }
  };

  const stepFrame = (frames: number) => {
    if (videoRef.current) {
      const fps = meta?.video_stream?.fps || 24.0;
      const step = (1.0 / fps) * frames;
      const nextTime = Math.min(Math.max(0, videoRef.current.currentTime + step), duration);
      videoRef.current.currentTime = nextTime;
      setCurrentTime(nextTime);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => console.warn(err));
    } else {
      document.exitFullscreen().catch((err) => console.warn(err));
    }
  };

  const formatTime = (secs: number): string => {
    if (!Number.isFinite(secs) || isNaN(secs) || secs < 0) return '00:00:00';
    const total = Math.floor(secs);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };


  return (
    <div className="flex-1 bg-surface-container-lowest flex flex-col h-full overflow-y-auto select-none p-6 space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-outline-variant">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-white/10 text-white border border-white/20">
              <Film className="w-4 h-4" />
            </span>
            <h1 className="text-sm font-bold text-white uppercase tracking-wide">
              İnteraktif Medya & Canlı Altyazı Önizleme
            </h1>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Seçili videoyu altyazılarıyla birlikte doğrudan oynatın ve zamanlamayı inceleyin.
          </p>
        </div>

        {selectedItem && (
          <div className="flex items-center space-x-3">
            <span className="px-3 py-1.5 rounded-lg bg-surface-container border border-outline-variant text-xs font-mono text-white font-bold">
              {selectedItem.fileName}
            </span>
          </div>
        )}
      </div>

      {!selectedItem ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 border-2 border-dashed border-outline-variant rounded-2xl text-center space-y-3 bg-surface-container/20">
          <Film className="w-12 h-12 text-neutral-500 opacity-60" />
          <h3 className="text-sm font-bold text-white">Önizlenecek Dosya Seçilmedi</h3>
          <p className="text-xs text-neutral-400 max-w-sm">
            Lütfen sol menüden Ana Sayfa veya Altyazı sekmesine dönüp bir video dosyası seçin.
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col space-y-4">
          {/* Full-Width Cinema Video Player Surface */}
          <div
            ref={containerRef}
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => isPlaying && setShowControls(false)}
            className="w-full aspect-video max-h-[540px] bg-black rounded-2xl border border-outline-variant flex flex-col items-center justify-center relative overflow-hidden shadow-2xl group mx-auto"
          >
              {/* HTML5 Video Surface */}
              <video
                ref={videoRef}
                src={streamUrl || (activeFilePath ? convertMediaSrc(activeFilePath) : '')}
                onPlay={() => setIsPlaying(true)}
                onPlaying={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onClick={togglePlay}
                onError={() => {
                  setIsPlaying(false);
                  setVideoError('Video yüklenemedi: codec desteklenmiyor veya dosya okunamıyor.');
                }}
                className="w-full h-full object-contain cursor-pointer"
              />

              {/* Playback Error Overlay */}
              {videoError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0c10]/95 z-30 pointer-events-none">
                  <p className="text-red-400 text-sm font-bold font-mono">{videoError}</p>
                  <p className="text-gray-500 text-[10px] font-mono mt-1 truncate max-w-[80%]">{activeFilePath}</p>
                </div>
              )}
              {/* REAL-TIME SYNCHRONIZED ANIME SUBTITLE OVERLAY (LIKE MPV / LIBASS) */}
              {currentCueText && activeSubTrack !== 'none' && (
                <div className="absolute bottom-16 inset-x-6 text-center pointer-events-none z-20 flex justify-center">
                  <div
                    className="inline-block px-4 py-2 text-base md:text-xl font-extrabold text-white tracking-wide max-w-2xl leading-snug whitespace-pre-line text-center"
                    style={{
                      fontFamily: "'Segoe UI', 'Trebuchet MS', Arial, sans-serif",
                      textShadow:
                        '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 3px 8px rgba(0,0,0,0.9), 0 0 10px rgba(0,0,0,0.7)',
                    }}
                  >
                    {currentCueText}
                  </div>
                </div>
              )}

              {/* Active Filter Badges */}
              <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 pointer-events-none z-10">
                {activeSubTrack !== 'none' && subtitleDialogues.length > 0 ? (
                  <span className="px-2 py-0.5 rounded bg-white/10 text-white text-[10px] font-mono border border-white/20 backdrop-blur-sm">
                    📝 Altyazı Aktif {loadingSubs ? '(Yükleniyor...)' : `(${subtitleDialogues.length} Satır)`}
                  </span>
                ) : meta && meta.subtitle_streams && meta.subtitle_streams.length === 0 ? (
                  <span className="px-2 py-0.5 rounded bg-white/5 text-neutral-300 text-[10px] font-mono border border-white/10 backdrop-blur-sm">
                    🎥 Piksele Gömülü (Hardsub)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-surface-container-high text-neutral-400 text-[10px] font-mono border border-outline-variant backdrop-blur-sm">
                    Altyazı: Kapalı
                  </span>
                )}
                {config.model_settings.upscale_enabled && (
                  <span className="px-2 py-0.5 rounded bg-white/10 text-white text-[10px] font-mono border border-white/20 backdrop-blur-sm">
                    {config.model_settings.target_height === 2160 ? '4K UHD' : config.model_settings.target_height === 1440 ? '2K QHD' : '2x AI'}
                  </span>
                )}
                {config.model_settings.frame_gen_enabled && (
                  <span className="px-2 py-0.5 rounded bg-white/10 text-white text-[10px] font-mono border border-white/20 backdrop-blur-sm">
                    ⚡ {config.model_settings.target_fps} FPS
                  </span>
                )}
              </div>

              {/* Center Large Play Splash */}
              {!isPlaying && !videoError && (
                <button
                  onClick={togglePlay}
                  className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-white hover:bg-neutral-200 text-black flex items-center justify-center shadow-xl shadow-white/10 transition transform active:scale-95 z-10"
                >
                  <Play className="w-6 h-6 fill-black ml-0.5" />
                </button>
              )}

              {/* Bottom Fansub Controls Bar */}
              <div
                className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-3 pt-6 flex flex-col space-y-2 transition-opacity duration-300 z-10 ${
                  showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
              >
                {/* YouTube Style Interactive Timeline Scrubber */}
                <div
                  ref={progressBarRef}
                  onMouseMove={handleProgressBarMouseMove}
                  onMouseLeave={handleProgressBarMouseLeave}
                  className="group/scrubber relative py-2 -my-2 flex items-center cursor-pointer select-none"
                >
                  {/* Hover Time Tooltip */}
                  {hoverPosition && (
                    <div
                      className="absolute -top-7 -translate-x-1/2 bg-black/90 text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-white/20 pointer-events-none z-20 shadow-lg backdrop-blur-sm transition-opacity"
                      style={{ left: `${hoverPosition.percent}%` }}
                    >
                      {formatTime(hoverPosition.time)}
                    </div>
                  )}

                  {/* Background Track */}
                  <div className="relative w-full h-1 group-hover/scrubber:h-2 bg-white/20 rounded-full transition-all overflow-hidden">
                    {/* Hover Preview Bar */}
                    {hoverPosition && (
                      <div
                        className="absolute left-0 top-0 bottom-0 bg-white/30 rounded-full pointer-events-none"
                        style={{ width: `${hoverPosition.percent}%` }}
                      />
                    )}

                    {/* Active Played Progress Fill Line */}
                    <div
                      className="absolute left-0 top-0 bottom-0 bg-white rounded-full transition-none shadow-sm shadow-white/30"
                      style={{ width: `${duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0}%` }}
                    />
                  </div>

                  {/* Playhead Scrubber Knob / Dot */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md shadow-black/80 scale-0 group-hover/scrubber:scale-100 transition-transform pointer-events-none z-10"
                    style={{ left: `${duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0}%` }}
                  />

                  {/* Underlying Range Input for smooth dragging and accessibility */}
                  <input
                    type="range"
                    min="0"
                    max={duration || 100}
                    step="0.05"
                    value={currentTime}
                    onMouseDown={handleSeekStart}
                    onTouchStart={handleSeekStart}
                    onChange={handleSeekChange}
                    onMouseUp={handleSeekCommit}
                    onTouchEnd={handleSeekCommit}
                    onKeyUp={handleSeekCommit}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                </div>

                {/* Controls Row */}
                <div className="flex items-center justify-between text-xs text-gray-200">
                  <div className="flex items-center space-x-2">
                    {/* Play/Pause */}
                    <button
                      onClick={togglePlay}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-white transition"
                    >
                      {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
                    </button>

                    {/* Frame Step Back / Forward */}
                    <button
                      onClick={() => stepFrame(-1)}
                      className="p-1 rounded hover:bg-white/10 text-gray-300 transition"
                      title="1 Kare Geri (-1 frame)"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => stepFrame(1)}
                      className="p-1 rounded hover:bg-white/10 text-gray-300 transition"
                      title="1 Kare İleri (+1 frame)"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    {/* Skip -5s / +5s */}
                    <button
                      onClick={() => skipTime(-5)}
                      className="p-1 rounded hover:bg-white/10 text-gray-300 transition"
                      title="-5 saniye"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => skipTime(5)}
                      className="p-1 rounded hover:bg-white/10 text-gray-300 transition"
                      title="+5 saniye"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>

                    {/* Timecode */}
                    <span className="text-[11px] font-mono text-gray-300 pl-1">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2.5">
                    {/* Subtitle Track Selector in Player Bar */}
                    <div className="flex items-center space-x-1 bg-black/70 px-2 py-0.5 rounded border border-white/20">
                      <FileText className="w-3 h-3 text-white" />
                      <select
                        value={activeSubTrack}
                        onChange={(e) => setActiveSubTrack(e.target.value)}
                        className="bg-transparent text-gray-200 text-[10px] font-mono focus:outline-none cursor-pointer max-w-[130px] truncate"
                      >
                        {meta && meta.subtitle_streams.length > 0 ? (
                          meta.subtitle_streams.map((sub) => (
                            <option key={sub.index} value={sub.subtitle_index.toString()} className="bg-surface-container-high text-white">
                              {sub.title || `Altyazı #${sub.subtitle_index + 1}`} [{sub.language.toUpperCase()}]
                            </option>
                          ))
                        ) : (
                          <option value="none" className="bg-surface-container-high text-neutral-400">
                            Altyazı Yok (Hardsub)
                          </option>
                        )}
                        {(previewExternalSubPath || config.external_subtitle_path) && (
                          <option value="external" className="bg-surface-container-high text-white">
                            Harici: {(previewExternalSubPath || config.external_subtitle_path || '').split(/[\\/]/).pop()}
                          </option>
                        )}
                        <option value="none" className="bg-surface-container-high text-white">Kapalı</option>
                      </select>
                    </div>

                    {/* Volume */}
                    <div className="flex items-center space-x-1.5">
                      <button onClick={toggleMute} className="text-gray-300 hover:text-white">
                        {isMuted || volume === 0 ? (
                          <VolumeX className="w-4 h-4 text-white" />
                        ) : (
                          <Volume2 className="w-4 h-4" />
                        )}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="w-12 h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-white"
                      />
                    </div>

                    {/* Speed Selector */}
                    <select
                      value={playbackRate}
                      onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                      className="bg-black/50 text-neutral-200 text-[10px] font-mono px-1.5 py-0.5 rounded border border-white/20 focus:outline-none"
                    >
                      <option value={0.5} className="bg-surface-container-high">0.5x</option>
                      <option value={1.0} className="bg-surface-container-high">1.0x</option>
                      <option value={1.25} className="bg-surface-container-high">1.25x</option>
                      <option value={1.5} className="bg-surface-container-high">1.5x</option>
                      <option value={2.0} className="bg-surface-container-high">2.0x</option>
                    </select>

                    {/* Fullscreen */}
                    <button
                      onClick={toggleFullscreen}
                      className="p-1 rounded hover:bg-white/10 text-gray-300 transition"
                      title="Tam Ekran"
                    >
                      <Maximize className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
          </div>

          {/* Bottom Diagnostics & Subtitle Controls Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Technical Stream Details */}
            <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant space-y-2.5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wide flex items-center space-x-2">
                <Layers className="w-4 h-4 text-white" />
                <span>Teknik Video & Akış Bilgileri</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded-xl bg-surface-container-high border border-outline-variant">
                  <span className="text-neutral-400 block text-[10px]">Çözünürlük:</span>
                  <span className="text-white font-bold">
                    {meta?.video_stream?.width || 1920}x{meta?.video_stream?.height || 1080}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-surface-container-high border border-outline-variant">
                  <span className="text-neutral-400 block text-[10px]">Kare Hızı:</span>
                  <span className="text-white font-bold">{meta?.video_stream?.fps.toFixed(2) || '24.00'} FPS</span>
                </div>
                <div className="p-2.5 rounded-xl bg-surface-container-high border border-outline-variant">
                  <span className="text-neutral-400 block text-[10px]">Video Codec:</span>
                  <span className="text-white font-bold">{meta?.video_stream?.codec.toUpperCase() || 'H264'}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-surface-container-high border border-outline-variant">
                  <span className="text-neutral-400 block text-[10px]">Piksel Formatı:</span>
                  <span className="text-white font-bold">{meta?.video_stream?.pix_fmt || 'yuv420p'}</span>
                </div>
              </div>
            </div>

            {/* Subtitle Tracks & Font Attachments Summary */}
            <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-white uppercase tracking-wide flex items-center space-x-2">
                  <Eye className="w-4 h-4 text-white" />
                  <span>Altyazı & Font Durumu</span>
                </h3>
                <button
                  onClick={handleLoadExternalSub}
                  className="px-2 py-1 rounded bg-white/10 border border-white/20 text-white text-[10px] font-mono hover:bg-white/20 transition cursor-pointer"
                >
                  .ass/.srt Yükle
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded-xl bg-surface-container-high border border-outline-variant">
                  <span className="text-neutral-400 block text-[10px]">Gömülü Altyazı:</span>
                  <span className="text-white font-bold">{meta?.subtitle_streams?.length || 0} Akış</span>
                </div>
                <div className="p-2.5 rounded-xl bg-surface-container-high border border-outline-variant">
                  <span className="text-neutral-400 block text-[10px]">Gömülü Fontlar:</span>
                  <span className="text-white font-bold">{meta?.font_count || 0} Font Eki</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
