import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Minimize2,
  FileVideo,
  Sparkles,
  Folder,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  XCircle,
  Cpu,
  Share2,
  Smartphone,
  Sliders,
  Flame,
  Zap,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import type {
  EncodeJobConfig,
  EncodeProgress,
  HardwareProfile,
  JobLogMessage,
  MediaMetadata,
} from '../types';
import {
  selectMediaFile,
  selectOutputDirectory,
  probeMedia,
  startEncode,
  pauseEncode,
  resumeEncode,
  cancelEncode,
  openInSystemPlayer,
  onEncodeProgress,
  onEncodeLog,
  normalizeClientPath,
} from '../services/tauri';
import { ProgressBar } from './ui';

interface CompressorViewProps {
  hardware: HardwareProfile | null;
}

type CompressorPresetId =
  | 'lossless_av1'
  | 'master_av1_fast'
  | 'lossless_hevc'
  | 'social_discord_basic'
  | 'social_discord_nitro'
  | 'social_telegram'
  | 'compact_mobile'
  | 'custom';
interface PresetCard {
  id: CompressorPresetId;
  title: string;
  badge: string;
  badgeVariant: 'success' | 'ai' | 'warning' | 'primary';
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  details: string;
  isRecommended?: boolean;
}

const PRESET_CARDS: PresetCard[] = [
  {
    id: 'lossless_av1',
    title: 'Kayıpsıza Yakın Akıllı AV1 (10-Bit)',
    badge: 'Tavsiye Edilen • %65-%75 Tasarruf',
    badgeVariant: 'success',
    description: 'Yeni nesil AV1 10-bit codec ile insan gözünün ayırt edemeyeceği görsel kayıpsızlık.',
    details: 'libsvtav1 / GPU AV1 • CRF 24 • Opus 128k • Anime Tune & Film Grain',
    icon: Sparkles,
    isRecommended: true,
  },
  {
    id: 'master_av1_fast',
    title: 'Master AV1 Hızlı & Ultra Net (CRF 15 / Preset 7)',
    badge: 'CRF 15 • Preset 7 • 5 B-Frame • AAC',
    badgeVariant: 'ai',
    description: 'SVT-AV1 Preset 7 ve CRF 15 ile ultra hızlı render ve stüdyo master netliği.',
    details: 'libsvtav1 • Preset 7 • CRF 15 • -bf 5 • AAC 192k',
    icon: Zap,
  },
  {
    id: 'lossless_hevc',
    title: 'Master Arşiv HEVC / x265 (10-Bit)',
    badge: '%55-%65 Tasarruf • Yüksek Uyumluluk',
    badgeVariant: 'ai',
    description: '10-bit renk derinliği ile color banding önleyen, TV ve oynatıcılarla tam uyumlu profil.',
    details: 'libx265 / GPU HEVC • CRF 22 • no-sao=1 & aq-mode=3 • AAC 192k',
    icon: ShieldCheck,
  },
  {
    id: 'social_discord_basic',
    title: 'Discord Free / Web Paylaşım',
    badge: '25 MB Hedef',
    badgeVariant: 'primary',
    description: 'Discord ücretsiz hesaplar ve hızlı web mesajlaşmaları için tam 25 MB boyut sınırı.',
    details: 'Otomatik Bitrate Hesaplama • H.264 / AV1 • AAC 128k',
    icon: Share2,
  },
  {
    id: 'social_discord_nitro',
    title: 'Discord Nitro / WhatsApp',
    badge: '50 MB Hedef',
    badgeVariant: 'primary',
    description: 'Discord Nitro ve sohbet uygulamaları için dengeli yüksek kalite ve düşük boyut.',
    details: 'Otomatik Bitrate Hesaplama • H.264 / HEVC • AAC 128k',
    icon: Share2,
  },
  {
    id: 'social_telegram',
    title: 'Telegram & Web Yayın',
    badge: '100 MB Hedef',
    badgeVariant: 'primary',
    description: 'Telegram ve web siteleri için 100 MB altı yüksek görsel netlik.',
    details: 'Otomatik Bitrate Hesaplama • Faststart Web Akışı',
    icon: Share2,
  },
  {
    id: 'compact_mobile',
    title: 'Ultra Kompakt / Mobil Arşiv',
    badge: '~%80 Tasarruf',
    badgeVariant: 'warning',
    description: 'Telefonlar ve kısıtlı depolama alanları için ultra hafif boyut (~150-200 MB).',
    details: 'AV1 / HEVC • Optimize Bitrate • Opus 96k',
    icon: Smartphone,
  },
  {
    id: 'custom',
    title: 'Özel Hedef Boyut / Oran',
    badge: 'Esnek Kontrol',
    badgeVariant: 'ai',
    description: 'Doğrudan istediğiniz hedef megabaytı veya yüzde küçültme oranını kendiniz belirleyin.',
    details: 'İsteğe bağlı Hedef MB veya % Tasarruf Oranı',
    icon: Sliders,
  },
];

export const CompressorView: React.FC<CompressorViewProps> = ({ hardware }) => {
  // Source & Metadata
  const [sourceFile, setSourceFile] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<MediaMetadata | null>(null);
  const [isProbing, setIsProbing] = useState<boolean>(false);
  const [probeError, setProbeError] = useState<string | null>(null);

  // Configuration
  const [selectedPreset, setSelectedPreset] = useState<CompressorPresetId>('lossless_av1');
  const [customMode, setCustomMode] = useState<'target_mb' | 'percentage'>('target_mb');
  const [customTargetMb, setCustomTargetMb] = useState<number>(200);
  const [customPercentage, setCustomPercentage] = useState<number>(70);
  const [selectedEncoder, setSelectedEncoder] = useState<string>('libsvtav1');
  const [targetContainer, setTargetContainer] = useState<string>('mp4');
  const [outputFolder, setOutputFolder] = useState<string | null>(null);

  // Job Execution & Progress
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState<EncodeProgress | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [finalOutputPath, setFinalOutputPath] = useState<string | null>(null);
  const [recentLogs, setRecentLogs] = useState<string[]>([]);

  // Drag & drop highlight state
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);

  // Auto-detect best encoder based on hardware and preset
  useEffect(() => {
    if (!hardware) return;

    const hasAv1Gpu = hardware.supported_encoders.some(
      (e) => (e.id === 'av1_nvenc' || e.id === 'av1_amf' || e.id === 'av1_qsv') && e.is_available
    );
    const hasHevcGpu = hardware.supported_encoders.some(
      (e) => (e.id === 'hevc_nvenc' || e.id === 'hevc_amf' || e.id === 'hevc_vaapi' || e.id === 'hevc_qsv') && e.is_available
    );

    if (selectedPreset === 'lossless_av1' || selectedPreset === 'master_av1_fast') {
      if (hasAv1Gpu) {
        const gpuAv1 = hardware.supported_encoders.find((e) => e.id.startsWith('av1_') && e.is_available);
        setSelectedEncoder(gpuAv1 ? gpuAv1.id : 'libsvtav1');
      } else {
        setSelectedEncoder('libsvtav1');
      }
    } else if (selectedPreset === 'lossless_hevc') {
      if (hasHevcGpu) {
        const gpuHevc = hardware.supported_encoders.find((e) => e.id.startsWith('hevc_') && e.is_available);
        setSelectedEncoder(gpuHevc ? gpuHevc.id : 'libx265');
      } else {
        setSelectedEncoder('libx265');
      }
    } else if (selectedPreset === 'compact_mobile') {
      setSelectedEncoder('libsvtav1');
    }
  }, [selectedPreset, hardware]);

  // Load file and probe metadata
  const handleLoadFile = useCallback(async (filePath: string) => {
    const cleanPath = normalizeClientPath(filePath);
    setSourceFile(cleanPath);
    setIsProbing(true);
    setProbeError(null);
    setSuccessMsg(null);
    setErrorMsg(null);
    setProgress(null);
    setFinalOutputPath(null);

    try {
      const meta = await probeMedia(cleanPath);
      setMetadata(meta);
      if (meta.file_size) {
        const sizeMb = meta.file_size / (1024 * 1024);
        setCustomTargetMb(Math.max(25, Math.round(sizeMb * 0.35)));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setProbeError(`Video analizi başarısız: ${msg}`);
    } finally {
      setIsProbing(false);
    }
  }, []);

  const handleSelectSource = async () => {
    const file = await selectMediaFile();
    if (file) {
      await handleLoadFile(file);
    }
  };

  const handleSelectOutput = async () => {
    const dir = await selectOutputDirectory();
    if (dir) setOutputFolder(dir);
  };

  // Drag and drop events for dropzone
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if ('path' in file && typeof file.path === 'string') {
        await handleLoadFile(file.path);
      }
    }
  };

  // Calculations for Duration, Original Size, Target Bitrate and Estimated Size
  const durationSec = useMemo(() => {
    return metadata?.duration_secs && metadata.duration_secs > 0
      ? metadata.duration_secs
      : 1422; // ~23m 42s default fallback
  }, [metadata]);

  const originalSizeMB = useMemo(() => {
    return metadata?.file_size ? metadata.file_size / (1024 * 1024) : 472.3;
  }, [metadata]);

  const {
    isBitrateMode,
    calculatedVideoBitrateKbps,
    calculatedAudioBitrateKbps,
    estimatedOutputMB,
    savingsPercentage,
    crfValue,
    qualityBadge,
  } = useMemo(() => {
    const audioBitrate = selectedPreset === 'compact_mobile' ? 96 : 128;
    let isBitrate = false;
    let videoBitrate = 2200;
    let crf = 24;
    let estimatedMb = originalSizeMB * 0.35;

    const streamHeight = metadata?.video_stream?.height || 1080;
    const is4K = streamHeight >= 2160;
    const is1080p = streamHeight >= 1080;

    switch (selectedPreset) {
      case 'lossless_av1': {
        isBitrate = false;
        crf = 24;
        const ratio = 0.32; // ~68% savings
        estimatedMb = originalSizeMB * ratio;
        videoBitrate = Math.round(((estimatedMb * 8192) / durationSec) - audioBitrate);
        break;
      }
      case 'master_av1_fast': {
        isBitrate = false;
        crf = 15;
        const ratio = 0.50; // ~50% savings with master clarity
        estimatedMb = originalSizeMB * ratio;
        videoBitrate = Math.round(((estimatedMb * 8192) / durationSec) - audioBitrate);
        break;
      }
      case 'lossless_hevc': {
        isBitrate = false;
        crf = 21;
        const ratio = 0.38; // ~62% savings
        estimatedMb = originalSizeMB * ratio;
        videoBitrate = Math.round(((estimatedMb * 8192) / durationSec) - audioBitrate);
        break;
      }
      case 'social_discord_basic': {
        isBitrate = true;
        const targetMb = 24.5;
        estimatedMb = targetMb;
        videoBitrate = Math.max(80, Math.floor((targetMb * 8192) / durationSec - audioBitrate));
        break;
      }
      case 'social_discord_nitro': {
        isBitrate = true;
        const targetMb = 49.5;
        estimatedMb = targetMb;
        videoBitrate = Math.max(100, Math.floor((targetMb * 8192) / durationSec - audioBitrate));
        break;
      }
      case 'social_telegram': {
        isBitrate = true;
        const targetMb = 99.0;
        estimatedMb = targetMb;
        videoBitrate = Math.max(150, Math.floor((targetMb * 8192) / durationSec - audioBitrate));
        break;
      }
      case 'compact_mobile': {
        isBitrate = true;
        const targetMb = Math.min(originalSizeMB * 0.22, 190);
        estimatedMb = targetMb;
        videoBitrate = Math.max(100, Math.floor((targetMb * 8192) / durationSec - audioBitrate));
        break;
      }
      case 'custom': {
        isBitrate = true;
        if (customMode === 'target_mb') {
          estimatedMb = Math.max(5, customTargetMb);
        } else {
          estimatedMb = Math.max(5, originalSizeMB * (1 - customPercentage / 100));
        }
        videoBitrate = Math.max(80, Math.floor((estimatedMb * 8192) / durationSec - audioBitrate));
        break;
      }
    }

    const savings = Math.max(0, Math.round(((originalSizeMB - estimatedMb) / originalSizeMB) * 100));

    // Quality Security Badge Assessment
    let badgeColor: 'green' | 'yellow' | 'red' = 'green';
    let badgeText = 'Mükemmel Kalite (Şeffaf / Orijinalden Farksız)';
    let badgeDesc = 'İnsan gözüyle orijinal master dosya arasında hiçbir fark görünmez.';

    if (is4K) {
      if (videoBitrate >= 4500) {
        badgeColor = 'green';
        badgeText = 'Mükemmel 4K Kalitesi (Görsel Kayıpsız)';
        badgeDesc = '4K HDR/SDR detayları, ince çizgiler ve grain kusursuz korunur.';
      } else if (videoBitrate >= 2400) {
        badgeColor = 'yellow';
        badgeText = 'Dengeli 4K Kalitesi (Yüksek Tasarruf)';
        badgeDesc = 'Çok hafif detay kaybı olabilir ancak boyut ciddi oranda küçülür.';
      } else {
        badgeColor = 'red';
        badgeText = 'Agresif 4K Sıkıştırma (Detay Kaybı Olası)';
        badgeDesc = 'Karanlık sahnelerde veya hızlı aksiyonda sıkıştırma artefaktları oluşabilir.';
      }
    } else if (is1080p) {
      if (videoBitrate >= 1800) {
        badgeColor = 'green';
        badgeText = 'Mükemmel 1080p Kalitesi (Görsel Kayıpsız)';
        badgeDesc = 'Anime çizgi hatları, gökyüzü renk geçişleri bozulmadan korunur.';
      } else if (videoBitrate >= 950) {
        badgeColor = 'yellow';
        badgeText = 'Dengeli 1080p Kalitesi (Web & Sosyal)';
        badgeDesc = 'Günlük izleme için harika, düşük boyut ve net görüntü.';
      } else {
        badgeColor = 'red';
        badgeText = 'Agresif 1080p Sıkıştırma (Düşük Bitrate)';
        badgeDesc = 'Dosya boyutu çok küçülür, yoğun sahnelerde hafif bulanıklık oluşabilir.';
      }
    } else {
      // 720p or lower
      if (videoBitrate >= 900) {
        badgeColor = 'green';
        badgeText = 'Mükemmel Kalite (720p)';
        badgeDesc = 'Net ve pürüzsüz görüntü.';
      } else if (videoBitrate >= 500) {
        badgeColor = 'yellow';
        badgeText = 'Dengeli Kalite (720p)';
        badgeDesc = 'Mobil cihazlar için ideal boyut.';
      } else {
        badgeColor = 'red';
        badgeText = 'Agresif Sıkıştırma (Ultra Kompakt)';
        badgeDesc = 'Minimum boyut öncelikli.';
      }
    }

    return {
      isBitrateMode: isBitrate,
      calculatedVideoBitrateKbps: Math.max(64, videoBitrate),
      calculatedAudioBitrateKbps: audioBitrate,
      estimatedOutputMB: Math.max(1, estimatedMb),
      savingsPercentage: savings,
      crfValue: crf,
      qualityBadge: { color: badgeColor, text: badgeText, desc: badgeDesc },
    };
  }, [
    selectedPreset,
    originalSizeMB,
    durationSec,
    metadata,
    customMode,
    customTargetMb,
    customPercentage,
  ]);

  // Subscribe to progress and logs
  useEffect(() => {
    let isMounted = true;
    let unProg: (() => void) | null = null;
    let unLog: (() => void) | null = null;

    onEncodeProgress((prog) => {
      if (!isMounted || !currentJobId || prog.job_id !== currentJobId) return;
      setProgress(prog);

      if (prog.status === 'completed') {
        setIsCompressing(false);
        setIsPaused(false);
        setSuccessMsg('Video başarıyla sıkıştırıldı!');
      } else if (prog.status === 'error') {
        setIsCompressing(false);
        setIsPaused(false);
        setErrorMsg('Sıkıştırma sırasında hata oluştu. Konsol sekmesinden logları inceleyebilirsiniz.');
      } else if (prog.status === 'cancelled') {
        setIsCompressing(false);
        setIsPaused(false);
      } else if (prog.status === 'paused') {
        setIsPaused(true);
      } else if (prog.status === 'running') {
        setIsPaused(false);
      }
    }).then((un) => {
      if (isMounted) unProg = un;
      else un();
    });

    onEncodeLog((log: JobLogMessage) => {
      if (!isMounted || !currentJobId || log.job_id !== currentJobId) return;
      setRecentLogs((prev) => [...prev.slice(-4), log.line]);
    }).then((un) => {
      if (isMounted) unLog = un;
      else un();
    });

    return () => {
      isMounted = false;
      if (unProg) unProg();
      if (unLog) unLog();
    };
  }, [currentJobId]);

  // Start Compression Job
  const handleStartCompression = async () => {
    if (!sourceFile) {
      alert('Lütfen önce sıkıştırılacak bir video dosyası seçin.');
      return;
    }

    setIsCompressing(true);
    setIsPaused(false);
    setErrorMsg(null);
    setSuccessMsg(null);
    setRecentLogs([]);

    const jobId = `compress_${Date.now()}`;
    setCurrentJobId(jobId);

    try {
      const baseName = sourceFile.split(/[\\/]/).pop()?.replace(/\.[^/.]+$/, '') || 'Compressed';
      const outDir =
        outputFolder ||
        sourceFile.substring(0, sourceFile.lastIndexOf(/[\\/]/.exec(sourceFile)?.[0] || '/'));
      const sep = outDir.includes('\\') ? '\\' : '/';
      const outPath = `${outDir}${sep}${baseName}_compressed_${selectedPreset}.${targetContainer}`;
      setFinalOutputPath(outPath);

      // Determine pixel format and audio codec
      const is10Bit = selectedPreset === 'lossless_av1' || selectedPreset === 'lossless_hevc' || selectedPreset === 'master_av1_fast';
      const pixFmt = is10Bit ? 'yuv420p10le' : 'yuv420p';
      const audioCodec = selectedPreset === 'lossless_av1' || selectedPreset === 'compact_mobile' ? 'libopus' : 'aac';
      const bFrames = selectedPreset === 'master_av1_fast' ? 5 : 4;

      // Encoder preset determination
      let encPreset = 'medium';
      if (selectedPreset === 'master_av1_fast') encPreset = '7';
      else if (selectedEncoder === 'libsvtav1') encPreset = '6';
      else if (selectedEncoder === 'libx265') encPreset = 'slow';
      else if (selectedEncoder.includes('nvenc')) encPreset = 'p5';
      else if (selectedEncoder.includes('amf')) encPreset = 'balanced';

      const config: EncodeJobConfig = {
        id: jobId,
        input_path: sourceFile,
        output_path: outPath,
        container: targetContainer,
        encoder: selectedEncoder,
        threads: hardware?.cpu_threads || 0,
        use_bitrate: isBitrateMode,
        average_bitrate_kbps: calculatedVideoBitrateKbps,
        crf: crfValue,
        preset: encPreset,
        pixel_format: pixFmt,
        b_frames: bFrames,
        custom_video_args: null,
        audio_track_index: 0,
        audio_codec: audioCodec,
        audio_bitrate_kbps: calculatedAudioBitrateKbps,
        hardsub_enabled: false,
        subtitle_source: 'none',
        subtitle_track_index: null,
        external_subtitle_path: null,
        resolved_subtitle_path: null,
        fonts_dir: null,
        intro_enabled: false,
        intro_video_path: null,
        model_settings: {
          upscale_enabled: false,
          upscale_model: '',
          backend: 'CPU',
          target_height: null,
          frame_gen_enabled: false,
          frame_gen_model: '',
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
      };

      await startEncode(config);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(`Sıkıştırma başlatılamadı: ${msg}`);
      setIsCompressing(false);
      setCurrentJobId(null);
    }
  };

  const handlePauseResume = async () => {
    if (!currentJobId) return;
    try {
      if (isPaused) {
        await resumeEncode(currentJobId);
        setIsPaused(false);
      } else {
        await pauseEncode(currentJobId);
        setIsPaused(true);
      }
    } catch (err) {
      console.error('Pause/Resume error:', err);
    }
  };

  const handleCancel = async () => {
    if (!currentJobId) return;
    try {
      await cancelEncode(currentJobId);
      setIsCompressing(false);
      setIsPaused(false);
      setCurrentJobId(null);
    } catch (err) {
      console.error('Cancel error:', err);
    }
  };

  const handleOpenOutput = () => {
    if (finalOutputPath) {
      openInSystemPlayer(finalOutputPath).catch(console.error);
    }
  };

  // Format Helpers
  const formatBytes = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 bg-surface-container-lowest flex flex-col h-full overflow-y-auto select-none p-6 space-y-6">
      {/* Header Banner */}
      <div className="pb-4 border-b border-outline-variant flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-white flex items-center space-x-2">
            <Minimize2 className="w-5 h-5 text-white" />
            <span>Akıllı Video Sıkıştırıcı (Smart Compressor)</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Görsel kaliteyi bozmadan 10-bit AV1 & HEVC ile video boyutunu %60-%75 küçültün.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-[11px] font-mono text-neutral-400 bg-surface-container px-3 py-1.5 rounded-lg border border-outline-variant">
          <Cpu className="w-3.5 h-3.5 text-white" />
          <span>Donanım: {hardware?.gpus?.[0]?.name || hardware?.cpu_name || 'CPU Standard'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Source Video & Preset Selection (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Source Video Card / Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingOver(true);
            }}
            onDragLeave={() => setIsDraggingOver(false)}
            onDrop={handleDrop}
            className={`p-5 rounded-2xl border transition-all duration-200 ${
              isDraggingOver
                ? 'bg-white/10 border-white shadow-xl shadow-white/5'
                : 'bg-surface-container border-outline-variant'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <FileVideo className="w-4 h-4 text-white" />
                <span>Kaynak Video Dosyası</span>
              </label>
              {metadata && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Analiz Tamamlandı
                </span>
              )}
            </div>

            <div className="flex space-x-2">
              <input
                type="text"
                readOnly
                value={sourceFile || 'Sıkıştırmak istediğiniz videoyu seçin veya buraya sürükleyin...'}
                className="flex-1 bg-surface-container-high text-neutral-200 text-xs rounded-xl border border-outline-variant px-3.5 py-2.5 font-mono truncate"
              />
              <button
                onClick={handleSelectSource}
                disabled={isCompressing}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                <FileVideo className="w-4 h-4" />
                <span>Gözat</span>
              </button>
            </div>

            {/* Video Analysis Specs */}
            {metadata ? (
              <div className="mt-4 pt-3 border-t border-outline-variant/60 grid grid-cols-4 gap-2 text-center">
                <div className="bg-surface-container-high/60 p-2 rounded-lg border border-outline-variant/40">
                  <div className="text-[10px] text-neutral-400 font-medium uppercase">Boyut</div>
                  <div className="text-xs font-mono font-bold text-white mt-0.5">
                    {formatBytes(metadata.file_size)}
                  </div>
                </div>
                <div className="bg-surface-container-high/60 p-2 rounded-lg border border-outline-variant/40">
                  <div className="text-[10px] text-neutral-400 font-medium uppercase">Süre</div>
                  <div className="text-xs font-mono font-bold text-white mt-0.5">
                    {metadata.duration_formatted || formatDuration(metadata.duration_secs)}
                  </div>
                </div>
                <div className="bg-surface-container-high/60 p-2 rounded-lg border border-outline-variant/40">
                  <div className="text-[10px] text-neutral-400 font-medium uppercase">Çözünürlük</div>
                  <div className="text-xs font-mono font-bold text-white mt-0.5">
                    {metadata.video_stream ? `${metadata.video_stream.width}x${metadata.video_stream.height}` : 'Bilinmiyor'}
                  </div>
                </div>
                <div className="bg-surface-container-high/60 p-2 rounded-lg border border-outline-variant/40">
                  <div className="text-[10px] text-neutral-400 font-medium uppercase">Mevcut Codec</div>
                  <div className="text-xs font-mono font-bold text-white mt-0.5 uppercase truncate">
                    {metadata.video_stream?.codec || 'Bilinmiyor'}
                  </div>
                </div>
              </div>
            ) : isProbing ? (
              <div className="mt-3 text-xs text-neutral-400 font-mono animate-pulse flex items-center space-x-2">
                <span>Video analiz ediliyor ve bitrate hesaplanıyor...</span>
              </div>
            ) : null}

            {probeError && (
              <div className="mt-3 p-2.5 rounded-lg bg-danger/10 border border-danger/20 text-xs text-danger flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{probeError}</span>
              </div>
            )}
          </div>

          {/* Presets Selection Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-white" />
                <span>Sıkıştırma Profili (Preset)</span>
              </label>
              <span className="text-[11px] text-neutral-400">
                Otomatik Bitrate & CRF Optimizasyonu
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PRESET_CARDS.map((p) => {
                const Icon = p.icon;
                const isSelected = selectedPreset === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => !isCompressing && setSelectedPreset(p.id)}
                    className={`p-3.5 rounded-2xl border transition-all text-left relative cursor-pointer ${
                      isSelected
                        ? 'bg-white/10 border-white text-white shadow-lg shadow-white/5 ring-1 ring-white/30'
                        : 'bg-surface-container border-outline-variant hover:border-white/30 text-neutral-300'
                    } ${isCompressing ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {p.isRecommended && (
                      <span className="absolute -top-2.5 right-3 bg-white text-black font-extrabold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow">
                        Tavsiye Edilen
                      </span>
                    )}
                    <div className="flex items-center space-x-2.5 mb-1.5">
                      <div
                        className={`p-1.5 rounded-lg ${
                          isSelected ? 'bg-white text-black' : 'bg-surface-container-high text-white'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-white truncate">{p.title}</h4>
                        <span className="text-[10px] text-neutral-400 block font-mono">{p.badge}</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-neutral-400 line-clamp-2 mt-1">{p.description}</p>
                    <div className="mt-2 pt-2 border-t border-outline-variant/40 text-[10px] font-mono text-neutral-500 truncate">
                      {p.details}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom Mode Parameters (Visible when preset === 'custom') */}
          {selectedPreset === 'custom' && (
            <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant space-y-4 animate-in fade-in-0 duration-200">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white flex items-center space-x-2">
                  <Sliders className="w-4 h-4 text-white" />
                  <span>Özel Sıkıştırma Parametreleri</span>
                </h4>
                <div className="flex bg-surface-container-high rounded-lg p-0.5 border border-outline-variant">
                  <button
                    onClick={() => setCustomMode('target_mb')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                      customMode === 'target_mb' ? 'bg-white text-black font-bold' : 'text-neutral-400'
                    }`}
                  >
                    Hedef Boyut (MB)
                  </button>
                  <button
                    onClick={() => setCustomMode('percentage')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                      customMode === 'percentage' ? 'bg-white text-black font-bold' : 'text-neutral-400'
                    }`}
                  >
                    Yüzde Küçültme (%)
                  </button>
                </div>
              </div>

              {customMode === 'target_mb' ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-400">Hedef Dosya Boyutu:</span>
                    <span className="text-white font-mono font-bold">{customTargetMb} MB</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={Math.max(100, Math.round(originalSizeMB * 0.95))}
                    step={5}
                    value={customTargetMb}
                    onChange={(e) => setCustomTargetMb(Number(e.target.value))}
                    className="w-full accent-white"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-400">Tasarruf Oranı (Küçültme):</span>
                    <span className="text-white font-mono font-bold">-%{customPercentage} Tasarruf</span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={90}
                    step={5}
                    value={customPercentage}
                    onChange={(e) => setCustomPercentage(Number(e.target.value))}
                    className="w-full accent-white"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Calculations, Quality Badge, Hardware & Start (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Live Before -> After Size & Savings Card */}
          <div className="p-5 rounded-2xl bg-surface-container border border-outline-variant space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
              <span>Canlı Boyut & Kalite Analizi</span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                -%{savingsPercentage} Tasarruf
              </span>
            </h3>

            {/* Before vs After Visual Comparison */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-surface-container-high border border-outline-variant">
                <div className="text-[10px] text-neutral-400 font-mono uppercase">Orijinal Boyut</div>
                <div className="text-base font-bold font-mono text-white mt-1">
                  {formatBytes(originalSizeMB * 1024 * 1024)}
                </div>
                <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
                  Bitrate: {metadata?.video_stream?.bitrate ? `${Math.round(metadata.video_stream.bitrate / 1000)} kbps` : 'Kaynak Bitrate'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/20">
                <div className="text-[10px] text-emerald-400 font-mono uppercase font-semibold">
                  Tahmini Çıktı
                </div>
                <div className="text-base font-bold font-mono text-white mt-1">
                  ~{formatBytes(estimatedOutputMB * 1024 * 1024)}
                </div>
                <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
                  Hedef Bitrate: ~{calculatedVideoBitrateKbps} kbps
                </div>
              </div>
            </div>

            {/* Quality Security Badge */}
            <div
              className={`p-3 rounded-xl border flex items-start space-x-3 ${
                qualityBadge.color === 'green'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                  : qualityBadge.color === 'yellow'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
              }`}
            >
              <div
                className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${
                  qualityBadge.color === 'green'
                    ? 'bg-emerald-400 shadow-md shadow-emerald-400/50'
                    : qualityBadge.color === 'yellow'
                    ? 'bg-amber-400 shadow-md shadow-amber-400/50'
                    : 'bg-rose-400 shadow-md shadow-rose-400/50'
                }`}
              />
              <div className="text-xs">
                <div className="font-bold text-white">{qualityBadge.text}</div>
                <div className="text-[11px] text-neutral-300 mt-0.5 opacity-90">{qualityBadge.desc}</div>
              </div>
            </div>

            {/* Encoder & Hardware Selector */}
            <div className="space-y-2 pt-2 border-t border-outline-variant">
              <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
                <span>Kodlayıcı (Encoder)</span>
                <span className="text-[10px] font-mono text-neutral-400">
                  {selectedEncoder.includes('nvenc') || selectedEncoder.includes('amf') || selectedEncoder.includes('qsv') || selectedEncoder.includes('vaapi')
                    ? '⚡ GPU Hızlandırma Aktif'
                    : '🖥️ Çok Çekirdekli CPU'}
                </span>
              </label>

              <select
                value={selectedEncoder}
                onChange={(e) => setSelectedEncoder(e.target.value)}
                disabled={isCompressing}
                className="w-full bg-surface-container-high text-white text-xs rounded-xl border border-outline-variant px-3 py-2.5 font-mono cursor-pointer disabled:opacity-50"
              >
                <optgroup label="AV1 Codec (Görsel Kayıpsız & En Yüksek Verim)">
                  {hardware?.supported_encoders.some((e) => e.id === 'av1_nvenc' && e.is_available) && (
                    <option value="av1_nvenc">av1_nvenc (NVIDIA GPU AV1)</option>
                  )}
                  {hardware?.supported_encoders.some((e) => e.id === 'av1_amf' && e.is_available) && (
                    <option value="av1_amf">av1_amf (AMD Radeon GPU AV1)</option>
                  )}
                  <option value="libsvtav1">libsvtav1 (CPU 10-Bit AV1 - Tavsiye Edilen)</option>
                </optgroup>

                <optgroup label="HEVC / H.265 (Yüksek Uyumluluk & 10-Bit)">
                  {hardware?.supported_encoders.some((e) => e.id === 'hevc_nvenc' && e.is_available) && (
                    <option value="hevc_nvenc">hevc_nvenc (NVIDIA GPU HEVC)</option>
                  )}
                  {hardware?.supported_encoders.some((e) => e.id === 'hevc_amf' && e.is_available) && (
                    <option value="hevc_amf">hevc_amf (AMD Radeon GPU HEVC)</option>
                  )}
                  {hardware?.supported_encoders.some((e) => e.id === 'hevc_vaapi' && e.is_available) && (
                    <option value="hevc_vaapi">hevc_vaapi (Linux VAAPI HEVC)</option>
                  )}
                  <option value="libx265">libx265 (CPU 10-Bit HEVC - Anime Optimize)</option>
                </optgroup>

                <optgroup label="H.264 / AVC (Maksimum Eski Cihaz Uyumluluğu)">
                  {hardware?.supported_encoders.some((e) => e.id === 'h264_nvenc' && e.is_available) && (
                    <option value="h264_nvenc">h264_nvenc (NVIDIA GPU H.264)</option>
                  )}
                  {hardware?.supported_encoders.some((e) => e.id === 'h264_amf' && e.is_available) && (
                    <option value="h264_amf">h264_amf (AMD Radeon GPU H.264)</option>
                  )}
                  <option value="libx264">libx264 (CPU H.264 Standart)</option>
                </optgroup>
              </select>
            </div>

            {/* Container & Output Folder */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-300 uppercase tracking-wide">
                  Format
                </label>
                <select
                  value={targetContainer}
                  onChange={(e) => setTargetContainer(e.target.value)}
                  disabled={isCompressing}
                  className="w-full bg-surface-container-high text-white text-xs rounded-xl border border-outline-variant px-3 py-2 font-mono cursor-pointer"
                >
                  <option value="mp4">MP4 (Web Faststart)</option>
                  <option value="mkv">MKV (Matroska)</option>
                  <option value="webm">WebM</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-300 uppercase tracking-wide">
                  Çıktı Klasörü
                </label>
                <button
                  onClick={handleSelectOutput}
                  disabled={isCompressing}
                  className="w-full flex items-center justify-between bg-surface-container-high hover:bg-neutral-700 text-white text-xs rounded-xl border border-outline-variant px-3 py-2 font-mono truncate"
                  title={outputFolder || 'Kaynak ile aynı klasör'}
                >
                  <span className="truncate">{outputFolder ? outputFolder.split(/[\\/]/).pop() : 'Aynı Klasör'}</span>
                  <Folder className="w-3.5 h-3.5 ml-1 flex-shrink-0 text-white" />
                </button>
              </div>
            </div>

            {/* Live Progress Display (Active when compressing) */}
            {isCompressing && progress && (
              <div className="p-4 rounded-xl bg-surface-container-high border border-outline-variant space-y-3 animate-in fade-in-0 duration-200">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-white flex items-center space-x-1.5">
                    <Flame className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
                    <span>Sıkıştırılıyor...</span>
                  </span>
                  <span className="font-mono font-bold text-white">
                    {progress.percentage.toFixed(1)}%
                  </span>
                </div>

                <ProgressBar
                  value={progress.percentage}
                  max={100}
                  variant="primary"
                  size="md"
                />

                <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono text-neutral-300 pt-1">
                  <div>
                    <span className="text-neutral-500 block">Hız</span>
                    <span className="font-bold text-white">{`${progress.speed.toFixed(1)}x`}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block">FPS</span>
                    <span className="font-bold text-white">{progress.fps}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block">Kalan Süre (ETA)</span>
                    <span className="font-bold text-white">{progress.eta_formatted || 'Hesaplanıyor'}</span>
                  </div>
                </div>

                {recentLogs.length > 0 && (
                  <div className="p-2 rounded bg-black/40 text-[9px] font-mono text-neutral-400 truncate">
                    {recentLogs[recentLogs.length - 1]}
                  </div>
                )}
              </div>
            )}

            {/* Start / Pause / Cancel Action Buttons */}
            <div className="pt-2 flex space-x-2">
              {!isCompressing ? (
                <button
                  onClick={handleStartCompression}
                  disabled={!sourceFile || isProbing}
                  className="w-full flex items-center justify-center space-x-2 bg-white hover:bg-neutral-200 disabled:opacity-50 text-black py-3.5 rounded-xl font-bold text-xs shadow-lg shadow-white/10 transition cursor-pointer"
                >
                  <Minimize2 className="w-4 h-4" />
                  <span>Akıllı Sıkıştırmayı Başlat</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={handlePauseResume}
                    className="flex-1 flex items-center justify-center space-x-1.5 bg-surface-container-high hover:bg-neutral-700 text-white py-3 rounded-xl font-bold text-xs border border-outline-variant transition"
                  >
                    {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                    <span>{isPaused ? 'Devam Et' : 'Duraklat'}</span>
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex-1 flex items-center justify-center space-x-1.5 bg-danger/20 hover:bg-danger/30 text-danger border border-danger/30 py-3 rounded-xl font-bold text-xs transition"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>İptal Et</span>
                  </button>
                </>
              )}
            </div>

            {/* Success & Error Notifications */}
            {successMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col space-y-2 text-xs text-emerald-200 animate-in fade-in-0 duration-200">
                <div className="flex items-center space-x-2 font-bold text-white">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{successMsg}</span>
                </div>
                {finalOutputPath && (
                  <div className="flex items-center justify-between pt-1 border-t border-emerald-500/20 text-[11px]">
                    <span className="font-mono truncate text-neutral-300">{finalOutputPath.split(/[\\/]/).pop()}</span>
                    <button
                      onClick={handleOpenOutput}
                      className="flex items-center space-x-1 text-white hover:underline font-semibold ml-2 flex-shrink-0 cursor-pointer"
                    >
                      <span>Oynat</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center space-x-2 text-xs text-rose-200">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
