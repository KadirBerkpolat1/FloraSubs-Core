import { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { EncodingView } from './components/EncodingView';
import { FileQueue } from './components/FileQueue';
import { SubtitleView } from './components/SubtitleView';
import { PreviewView } from './components/PreviewView';
import { ConverterView } from './components/ConverterView';
import { ConsoleView } from './components/ConsoleView';
import { SettingsView } from './components/SettingsView';
import type {
  EncodeJobConfig,
  EncodeProgress,
  HardwareProfile,
  JobLogMessage,
  PresetProfile,
  QueueItem,
} from './types';
import { getCurrentWindow } from '@tauri-apps/api/window';
import {
  cancelAllJobs,
  cancelEncode,
  getHardwareProfile,
  getPresets,
  onEncodeLog,
  onEncodeProgress,
  onDragDropFiles,
  pauseEncode,
  probeMedia,
  resumeEncode,
  selectMultipleMediaFiles,
  startEncode,
  isTauri,
} from './services/tauri';
export default function App() {
  const [activeTab, setActiveTab] = useState<string>('home');
  const [isBatchRunning, setIsBatchRunning] = useState<boolean>(false);
  const [currentBatchJobId, setCurrentBatchJobId] = useState<string | null>(null);
  const [hardware, setHardware] = useState<HardwareProfile | null>(null);
  const [presets, setPresets] = useState<PresetProfile[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('anime_web_x264');

  // Queue and Selection
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const queueRef = useRef<QueueItem[]>(queue);
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);
  // Global Config Form State
  const [config, setConfig] = useState<EncodeJobConfig>({
    id: `job_${Date.now()}`,
    input_path: '',
    output_path: '',
    container: 'mp4',
    encoder: 'h264_nvenc',
    threads: 0,
    use_bitrate: false,
    average_bitrate_kbps: 4000,
    crf: 22,
    preset: 'p4',
    pixel_format: 'yuv420p',
    b_frames: 4,
    custom_video_args: null,
    audio_track_index: 0,
    audio_codec: 'aac',
    audio_bitrate_kbps: 192,
    hardsub_enabled: true,
    subtitle_source: 'embedded',
    subtitle_track_index: 0,
    external_subtitle_path: null,
    resolved_subtitle_path: null,
    fonts_dir: null,
    intro_enabled: false,
    intro_video_path: null,
    model_settings: {
      upscale_enabled: false,
      upscale_model: 'Anime4K_Upscale_HD',
      backend: 'DML',
      target_height: null,
      frame_gen_enabled: false,
      frame_gen_model: 'SVP',
      target_fps: 60,
    },
    filter_settings: {
      line_darkening_enabled: false,
      line_darkening_value: 128,
      sharpness_enabled: false,
      sharpness_value: 128,
      grain_enabled: false,
      grain_value: 15,
    },
    faststart: true,
  });

  const configRef = useRef(config);
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const handleSelectItem = (item: QueueItem) => {
    setSelectedId(item.id);
    setConfig((prev) => ({
      ...prev,
      id: item.id,
      input_path: item.filePath,
      output_path: item.config.output_path,
    }));
  };

  const handleAddFilePaths = async (files: string[]) => {
    try {
      if (!files || files.length === 0) return;

      // Clean & deduplicate input paths
      const uniqueFiles = Array.from(
        new Set(files.filter((f) => typeof f === 'string' && f.trim().length > 0))
      );
      if (uniqueFiles.length === 0) return;

      // Filter out files already in queue
      const existingPaths = new Set(queueRef.current.map((item) => item.filePath));
      const freshFiles = uniqueFiles.filter((f) => !existingPaths.has(f));
      if (freshFiles.length === 0) return;

      const newItems: QueueItem[] = [];

      for (const file of freshFiles) {
        const fileName = file.split(/[\\/]/).pop() || file;
        const itemId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        let metadata = null;
        try {
          metadata = await probeMedia(file);
        } catch (probeErr) {
          console.warn('Dosya analizi başarısız:', probeErr);
        }

        const baseStem = fileName.replace(/\.[^/.]+$/, '');
        const savedOutput = localStorage.getItem('florasubs_default_output');
        const parentDir = savedOutput
          ? savedOutput
          : file.substring(0, file.lastIndexOf(/[\\/]/.exec(file)?.[0] || '/'));
        const sep = savedOutput ? '/' : (parentDir.includes('\\') ? '\\' : '/');
        const defaultOut = `${parentDir}${sep}${baseStem}_FloraSubs.${configRef.current.container}`;

        const itemConfig: EncodeJobConfig = {
          ...configRef.current,
          id: itemId,
          input_path: file,
          output_path: defaultOut,
        };

        newItems.push({
          id: itemId,
          filePath: file,
          fileName,
          fileSize: metadata?.file_size || 0,
          metadata,
          status: 'waiting',
          progress: {
            job_id: itemId,
            frame: 0,
            fps: 0,
            q: 0,
            size_bytes: 0,
            time_secs: 0,
            time_formatted: '00:00:00',
            bitrate_kbps: 0,
            speed: 0,
            percentage: 0,
            eta_secs: 0,
            eta_formatted: '--:--:--',
            elapsed_secs: 0,
            elapsed_formatted: '00:00:00',
            status: 'idle',
            error_message: null,
          },
          config: itemConfig,
        });
      }

      if (newItems.length === 0) return;

      setQueue((prev) => {
        const prevPaths = new Set(prev.map((i) => i.filePath));
        const nonDuplicateItems = newItems.filter((i) => !prevPaths.has(i.filePath));
        return [...prev, ...nonDuplicateItems];
      });

      if (!selectedId && newItems.length > 0) {
        handleSelectItem(newItems[0]);
      }
    } catch (err) {
      console.error('Dosya ekleme hatası:', err);
    }
  };

  const handleAddFiles = async () => {
    const files = await selectMultipleMediaFiles();
    await handleAddFilePaths(files);
  };

  // Batch Serialization
  const startNextInBatch = (currentQueue: QueueItem[]) => {
    const nextItem = currentQueue.find((i) => i.status === 'waiting');
    if (nextItem) {
      setQueue((prev) =>
        prev.map((i) => (i.id === nextItem.id ? { ...i, status: 'encoding' } : i))
      );
      setCurrentBatchJobId(nextItem.id);
      startEncode({ ...config, id: nextItem.id, input_path: nextItem.filePath }).catch((err) => {
        console.error('Batch job start error:', err);
        setTimeout(() => startNextInBatch(currentQueue), 100);
      });
    } else {
      setIsBatchRunning(false);
      setCurrentBatchJobId(null);
    }
  };

  // Logs
  const [logs, setLogs] = useState<JobLogMessage[]>([]);

  // Window close confirmation state
  const [showCloseConfirm, setShowCloseConfirm] = useState<boolean>(false);

  // Initialize hardware profile, presets and event listeners
  useEffect(() => {
    let isMounted = true;
    let unlistenProgress: (() => void) | null = null;
    let unlistenLog: (() => void) | null = null;
    let unlistenDragDrop: (() => void) | null = null;

    async function initSystem() {
      try {
        const hw = await getHardwareProfile();
        if (!isMounted) return;
        setHardware(hw);

        if (hw) {
          setConfig((prev) => ({
            ...prev,
            encoder: hw.recommended_encoder || prev.encoder,
            preset: hw.recommended_encoder?.includes('nvenc') ? 'p4' : 'slow',
            threads: hw.cpu_threads || prev.threads,
          }));
        }

        const pr = await getPresets();
        if (!isMounted) return;
        setPresets(pr);
      } catch (err) {
        console.error('Donanım algılama hatası:', err);
      }
    }

    initSystem();
    const win = window as unknown as { __addFiles?: (files: string[]) => Promise<void> };
    win.__addFiles = handleAddFilePaths;

    onEncodeProgress((progress: EncodeProgress) => {
      if (!isMounted) return;
      setQueue((prev) => {
        const newQueue = prev.map((item) => {
          if (item.id === progress.job_id) {
            let status = item.status;
            if (progress.status === 'completed') status = 'completed';
            else if (progress.status === 'error') status = 'error';
            else if (progress.status === 'cancelled') status = 'waiting';
            else if (progress.status === 'running') status = 'encoding';
            else if (progress.status === 'paused') status = 'paused';

            return { ...item, status, progress };
          }
          return item;
        });

        if (isBatchRunning && currentBatchJobId === progress.job_id && (progress.status === 'completed' || progress.status === 'error' || progress.status === 'cancelled')) {
           setTimeout(() => startNextInBatch(newQueue), 100);
        }
        
        return newQueue;
      });
    }).then((un) => {
      if (!isMounted) un();
      else unlistenProgress = un;
    });

    onEncodeLog((log: JobLogMessage) => {
      if (!isMounted) return;
      setLogs((prev) => [...prev.slice(-999), log]);
    }).then((un) => {
      if (!isMounted) un();
      else unlistenLog = un;
    });

    // Native Tauri Drag and Drop Event Listener
    if (isTauri()) {
      onDragDropFiles((paths) => {
        if (!isMounted) return;
        handleAddFilePaths(paths);
      }).then((un) => {
        if (!isMounted) un();
        else unlistenDragDrop = un;
      });
    }

    return () => {
      isMounted = false;
      if (unlistenProgress) unlistenProgress();
      if (unlistenLog) unlistenLog();
      if (unlistenDragDrop) unlistenDragDrop();
    };
  }, []);



  const handleRemoveItem = (id: string) => {
    setQueue((prev) => prev.filter((i) => i.id !== id));
    if (selectedId === id) {
      const remaining = queue.filter((i) => i.id !== id);
      setSelectedId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const handleClearQueue = () => {
    setQueue([]);
    setSelectedId(null);
  };

  // Start single encode
  const handleStartSingle = async () => {
    if (!selectedId) {
      alert('Lütfen kuyruktan bir video seçin.');
      return;
    }

    const currentItem = queue.find((i) => i.id === selectedId);
    if (!currentItem) return;

    const jobConfig: EncodeJobConfig = {
      ...config,
      id: currentItem.id,
      input_path: currentItem.filePath,
    };

    setQueue((prev) =>
      prev.map((i) => (i.id === currentItem.id ? { ...i, status: 'encoding', config: jobConfig } : i))
    );

    try {
      await startEncode(jobConfig);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Kodlama başlatılamadı: ${msg}`);
      setQueue((prev) =>
        prev.map((i) => (i.id === currentItem.id ? { ...i, status: 'error' } : i))
      );
    }
  };

  // Batch Encode All
  const handleStartBatch = async () => {
    const waitingItems = queue.filter((i) => i.status === 'waiting');
    if (waitingItems.length === 0) {
      alert('Kuyrukta bekleyen dosya bulunamadı.');
      return;
    }
    setIsBatchRunning(true);
    startNextInBatch(queue);
  };

  // Process Controls
  const handleStartItem = async (id: string) => {
    const item = queue.find((i) => i.id === id);
    if (!item) return;

    const jobConfig: EncodeJobConfig = {
      ...config,
      id: item.id,
      input_path: item.filePath,
    };

    setQueue((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: 'encoding', config: jobConfig } : i))
    );

    try {
      await startEncode(jobConfig);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Kodlama başlatılamadı: ${msg}`);
    }
  };

  const handlePauseItem = async (id: string) => {
    try {
      await pauseEncode(id);
      setQueue((prev) =>
        prev.map((i) => (i.id === id ? { ...i, status: 'paused' } : i))
      );
    } catch (err) {
      console.error('Duraklatma hatası:', err);
    }
  };

  const handleResumeItem = async (id: string) => {
    try {
      await resumeEncode(id);
      setQueue((prev) =>
        prev.map((i) => (i.id === id ? { ...i, status: 'encoding' } : i))
      );
    } catch (err) {
      console.error('Devam ettirme hatası:', err);
    }
  };

  const handleCancelItem = async (id: string) => {
    try {
      await cancelEncode(id);
      setQueue((prev) =>
        prev.map((i) => (i.id === id ? { ...i, status: 'waiting' } : i))
      );
    } catch (err) {
      console.error('İptal hatası:', err);
    }
  };

  // Preset Selection
  const handleSelectPreset = (preset: PresetProfile) => {
    setSelectedPresetId(preset.id);
    setConfig((prev) => ({
      ...prev,
      container: preset.container,
      encoder: preset.encoder,
      use_bitrate: preset.use_bitrate,
      average_bitrate_kbps: preset.average_bitrate_kbps,
      crf: preset.crf,
      preset: preset.preset,
      pixel_format: preset.pixel_format,
      audio_codec: preset.audio_codec,
      audio_bitrate_kbps: preset.audio_bitrate_kbps,
      b_frames: preset.b_frames,
      faststart: preset.faststart,
    }));
  };

  // Handle window close with confirmation if jobs are running
  useEffect(() => {
    if (!isTauri()) return;

    const handleClose = async (e: { preventDefault(): void }) => {
      e.preventDefault();
      const runningJobs = queue.filter(
        (item) => item.status === 'encoding' || item.status === 'paused'
      );
      if (runningJobs.length > 0) {
        setShowCloseConfirm(true);
      } else {
        getCurrentWindow().close();
      }
    };

    let unlisten: (() => void) | null = null;
    try {
      getCurrentWindow().onCloseRequested(handleClose).then((fn) => { unlisten = fn; });
    } catch {
      // Browser preview mode
    }
    return () => {
      if (unlisten) unlisten();
    };
  }, [queue]);

  const activeCount = queue.filter((i) => i.status === 'encoding').length;
  const selectedItem = queue.find((i) => i.id === selectedId) || null;


  const cancelClose = () => {
    setShowCloseConfirm(false);
  };

  const confirmClose = async () => {
    try {
      await cancelAllJobs();
    } catch (err) {
      console.error('İşlemler durdurulamadı:', err);
    }
    setShowCloseConfirm(false);
    getCurrentWindow().close();
  };
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-surface text-on-surface font-body">
      {/* Close Confirmation Modal */}
      {showCloseConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
          onClick={cancelClose}
        >
          <div
            className="bg-surface-container-high border border-outline-variant rounded-2xl p-6 max-w-md w-full mx-4 animate-in fade-in-0 zoom-in-95 duration-150 shadow-2xl shadow-black/80"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-on-surface mb-2 font-display">
              Kodlama İşlemleri Devam Ediyor
            </h3>
            <p className="text-on-surface-variant text-sm mb-4">
              {activeCount} kodlama işlemi aktif. Uygulamayı kapatırsanız işlemler durdurulacak.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelClose}
                className="px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-bright text-on-surface font-medium text-sm border border-outline-variant transition"
              >
                İptal
              </button>
              <button
                onClick={confirmClose}
                className="px-4 py-2 rounded-lg bg-danger hover:bg-rose-600 text-white font-bold text-sm shadow-md shadow-danger/30 transition"
              >
                İşlemleri Durdur ve Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Left Navigation Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} hardware={hardware} />

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header
          presets={presets}
          selectedPresetId={selectedPresetId}
          onSelectPreset={handleSelectPreset}
          activeCount={activeCount}
          totalQueue={queue.length}
        />

        {/* Tab Viewport */}
        <div className="flex-1 flex overflow-hidden">
          {activeTab === 'home' && (
            <div className="flex-1 flex h-full overflow-hidden">
              {/* Left Dock: Ingestion Queue */}
              <div className="w-[280px] flex-shrink-0 h-full border-r border-outline-variant flex flex-col bg-surface-container-low">
                <FileQueue
                  queue={queue}
                  selectedId={selectedId}
                  onSelect={handleSelectItem}
                  onAddFiles={handleAddFiles}
                  onRemoveItem={handleRemoveItem}
                  onClearQueue={handleClearQueue}
                  onStartItem={handleStartItem}
                  onPauseItem={handlePauseItem}
                  onResumeItem={handleResumeItem}
                  onCancelItem={handleCancelItem}
                />
              </div>

              {/* Center Canvas: Live Video & Subtitle Preview Monitor */}
              <div className="flex-1 min-w-0 h-full bg-surface-canvas overflow-hidden flex flex-col">
                <PreviewView selectedItem={selectedItem} config={config} />
              </div>

              {/* Right Inspector: Encoding & GPU Studio Controls */}
              <div className="w-[360px] flex-shrink-0 h-full border-l border-outline-variant bg-surface-container-low overflow-y-auto">
                <EncodingView
                  config={config}
                  setConfig={setConfig}
                  selectedItem={selectedItem}
                  hardware={hardware}
                  onStartSingle={handleStartSingle}
                  onStartBatch={handleStartBatch}
                  isEncoding={activeCount > 0}
                />
              </div>
            </div>
          )}

          {activeTab === 'subtitle' && (
            <SubtitleView
              selectedItem={selectedItem}
              config={config}
              setConfig={setConfig}
            />
          )}

          {activeTab === 'preview' && (
            <PreviewView selectedItem={selectedItem} config={config} />
          )}

          {activeTab === 'converter' && <ConverterView />}

          {activeTab === 'console' && (
            <ConsoleView logs={logs} onClearLogs={() => setLogs([])} />
          )}

          {activeTab === 'settings' && <SettingsView hardware={hardware} />}
        </div>
      </div>
    </div>
  );
}