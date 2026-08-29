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
  Sliders,
  Flame,
  Zap,
  ExternalLink,
  ShieldCheck,
  Activity,
  Volume2,
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

type StudioPresetId =
  | 'av1_master_archive'
  | 'av1_fast_master'
  | 'av1_balanced_fansub'
  | 'hevc_master_10bit'
  | 'custom_studio';

interface StudioPresetCard {
  id: StudioPresetId;
  title: string;
  badge: string;
  badgeVariant: 'success' | 'ai' | 'warning' | 'primary';
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  details: string;
  defaultEncoder: string;
  defaultCrf: number;
  defaultPreset: string;
  defaultBf: number;
  default10Bit: boolean;
  defaultAudioCodec: string;
  defaultAudioBitrate: number;
  isRecommended?: boolean;
}

const STUDIO_PRESETS: StudioPresetCard[] = [
  {
    id: 'av1_master_archive',
    title: 'AV1 Stüdyo Master (10-Bit)',
    badge: 'Maksimum Netlik • CRF 15 • %45-%55 Tasarruf',
    badgeVariant: 'ai',
    description: 'En yüksek görsel netlik ve film grain koruması ile stüdyo master arşiv standardı.',
    details: 'libsvtav1 • Preset 6 • CRF 15 • 10-Bit • -bf 5 • AAC 192k',
    defaultEncoder: 'libsvtav1',
    defaultCrf: 15,
    defaultPreset: '6',
    defaultBf: 5,
    default10Bit: true,
    defaultAudioCodec: 'aac',
    defaultAudioBitrate: 192,
    icon: Sparkles,
  },
  {
    id: 'av1_fast_master',
    title: 'AV1 Hızlı Kodlama & Master (Preset 7)',
    badge: 'Tavsiye Edilen • Ultra Hızlı • %50 Tasarruf',
    badgeVariant: 'success',
    description: 'SVT-AV1 Preset 7 ile yüksek işlemci hızında kristal netlikte video üretimi.',
    details: 'libsvtav1 • Preset 7 • CRF 15 • 10-Bit • -bf 5 • AAC 192k',
    defaultEncoder: 'libsvtav1',
    defaultCrf: 15,
    defaultPreset: '7',
    defaultBf: 5,
    default10Bit: true,
    defaultAudioCodec: 'aac',
    defaultAudioBitrate: 192,
    icon: Zap,
    isRecommended: true,
  },
  {
    id: 'av1_balanced_fansub',
    title: 'AV1 Yüksek Verimli Fansub',
    badge: 'CRF 24 • %65-%75 Boyut Tasarrufu',
    badgeVariant: 'primary',
    description: 'İnsan gözü için kayıpsıza yakın kalitede maksimum dosya boyutu küçültme.',
    details: 'libsvtav1 • Preset 7 • CRF 24 • 10-Bit • -bf 5 • Opus 128k',
    defaultEncoder: 'libsvtav1',
    defaultCrf: 24,
    defaultPreset: '7',
    defaultBf: 5,
    default10Bit: true,
    defaultAudioCodec: 'libopus',
    defaultAudioBitrate: 128,
    icon: Minimize2,
  },
  {
    id: 'hevc_master_10bit',
    title: 'HEVC / x265 10-Bit Master',
    badge: 'Evrensel Cihaz Uyumluluğu • %55-%65 Tasarruf',
    badgeVariant: 'warning',
    description: 'Eski TV ve medya oynatıcılarla tam uyumlu, no-sao filtreli 10-bit x265 arşivi.',
    details: 'libx265 • Preset Slow • CRF 21 • no-sao=1 & aq-mode=3 • AAC 192k',
    defaultEncoder: 'libx265',
    defaultCrf: 21,
    defaultPreset: 'slow',
    defaultBf: 4,
    default10Bit: true,
    defaultAudioCodec: 'aac',
    defaultAudioBitrate: 192,
    icon: ShieldCheck,
  },
  {
    id: 'custom_studio',
    title: 'Özel Stüdyo Yapılandırması (Full Custom)',
    badge: 'Tam Manuel Kontrol',
    badgeVariant: 'ai',
    description: 'Preset (0-13), CRF, B-Frame, Bitrate ve Ses ayarlarını serbestçe yönetin.',
    details: 'Tüm parametreler ve donanım kodlayıcıları serbest',
    defaultEncoder: 'libsvtav1',
    defaultCrf: 18,
    defaultPreset: '7',
    defaultBf: 5,
    default10Bit: true,
    defaultAudioCodec: 'aac',
    defaultAudioBitrate: 192,
    icon: Sliders,
  },
];

const SVT_AV1_PRESETS = [
  { val: '0', label: 'Preset 0 (Ultra Ağır - Araştırma / Arşiv)', desc: 'Maksimum sıkıştırma, çok yavaş' },
  { val: '1', label: 'Preset 1 (Ultra Yavaş)', desc: 'Aşırı yüksek verim' },
  { val: '2', label: 'Preset 2 (Çok Yavaş)', desc: 'Yüksek kalite stüdyo' },
  { val: '3', label: 'Preset 3 (Yavaş)', desc: 'Arşiv seviyesi' },
  { val: '4', label: 'Preset 4 (Master Arşiv - Ağır)', desc: 'Mükemmel kalite/boyut oranı' },
  { val: '5', label: 'Preset 5 (Yüksek Kalite)', desc: 'Dengeli arşiv' },
  { val: '6', label: 'Preset 6 (Dengeli Standart)', desc: 'Önerilen stüdyo standardı' },
  { val: '7', label: 'Preset 7 (Hızlı Master - Tavsiye Edilen)', desc: 'Hızlı CPU render & yüksek kalite' },
  { val: '8', label: 'Preset 8 (Hızlı)', desc: 'Günlük hızlı kodlama' },
  { val: '9', label: 'Preset 9 (Çok Hızlı)', desc: 'Hızlı paylaşım' },
  { val: '10', label: 'Preset 10 (Ultra Hızlı)', desc: 'Düşük CPU tüketimi' },
  { val: '11', label: 'Preset 11 (Süper Hızlı)', desc: 'Önizleme / taslak' },
  { val: '12', label: 'Preset 12 (Gerçek Zamanlı)', desc: 'Canlı akış hızı' },
  { val: '13', label: 'Preset 13 (Maksimum Hız)', desc: 'En düşük gecikme' },
];

const X265_PRESETS = [
  { val: 'veryslow', label: 'Very Slow (Maksimum Verim)' },
  { val: 'slower', label: 'Slower' },
  { val: 'slow', label: 'Slow (Stüdyo Standardı)' },
  { val: 'medium', label: 'Medium (Dengeli)' },
  { val: 'fast', label: 'Fast' },
  { val: 'faster', label: 'Faster' },
  { val: 'veryfast', label: 'Very Fast' },
  { val: 'superfast', label: 'Super Fast' },
  { val: 'ultrafast', label: 'Ultra Fast' },
];

const NVENC_PRESETS = [
  { val: 'p7', label: 'P7 (En Yüksek Kalite - Yavaş)' },
  { val: 'p6', label: 'P6 (Yüksek Kalite)' },
  { val: 'p5', label: 'P5 (Dengeli Hızlı - Önerilen)' },
  { val: 'p4', label: 'P4 (Standart)' },
  { val: 'p3', label: 'P3 (Hızlı)' },
  { val: 'p2', label: 'P2 (Çok Hızlı)' },
  { val: 'p1', label: 'P1 (Maksimum Hız)' },
];

export const CompressorView: React.FC<CompressorViewProps> = ({ hardware }) => {
  // Source & Metadata
  const [sourceFile, setSourceFile] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<MediaMetadata | null>(null);
  const [isProbing, setIsProbing] = useState<boolean>(false);
  const [probeError, setProbeError] = useState<string | null>(null);

  // Configuration State
  const [selectedPresetId, setSelectedPresetId] = useState<StudioPresetId>('av1_fast_master');
  const [rateControlMode, setRateControlMode] = useState<'crf' | 'bitrate'>('crf');
  const [encoder, setEncoder] = useState<string>('libsvtav1');
  const [crf, setCrf] = useState<number>(15);
  const [encoderPreset, setEncoderPreset] = useState<string>('7');
  const [bFrames, setBFrames] = useState<number>(5);
  const [is10Bit, setIs10Bit] = useState<boolean>(true);
  const [audioCodec, setAudioCodec] = useState<string>('aac');
  const [audioBitrate, setAudioBitrate] = useState<number>(192);
  const [targetBitrateKbps, setTargetBitrateKbps] = useState<number>(4500);
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

  // Apply preset values on card selection
  const handleSelectPreset = (preset: StudioPresetCard) => {
    setSelectedPresetId(preset.id);
    setRateControlMode('crf');
    setEncoder(preset.defaultEncoder);
    setCrf(preset.defaultCrf);
    setEncoderPreset(preset.defaultPreset);
    setBFrames(preset.defaultBf);
    setIs10Bit(preset.default10Bit);
    setAudioCodec(preset.defaultAudioCodec);
    setAudioBitrate(preset.defaultAudioBitrate);
  };

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
      if (meta.video_stream?.bitrate) {
        setTargetBitrateKbps(Math.round(meta.video_stream.bitrate / 2000));
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

  // Video Parameters & Visual Quality / VMAF / Loss Calculation
  const durationSec = useMemo(() => {
    return metadata?.duration_secs && metadata.duration_secs > 0
      ? metadata.duration_secs
      : 1422; // ~23m 42s default fallback
  }, [metadata]);

  const originalSizeMB = useMemo(() => {
    return metadata?.file_size ? metadata.file_size / (1024 * 1024) : 472.3;
  }, [metadata]);

  const width = metadata?.video_stream?.width || 1920;
  const height = metadata?.video_stream?.height || 1080;
  const fps = metadata?.video_stream?.fps || 24;

  const {
    estimatedVideoBitrateKbps,
    estimatedOutputMB,
    savingsPercentage,
    vmafScore,
    visualLossPercentage,
    bitsPerPixel,
    fidelityLevel,
  } = useMemo(() => {
    let videoBitrate = 3500;
    let sizeRatio = 0.50;

    const isAv1 = encoder.includes('av1') || encoder === 'libsvtav1';
    const isHevc = encoder.includes('hevc') || encoder === 'libx265';

    if (rateControlMode === 'crf') {
      // Dynamic Bitrate Estimation based on CRF and Codec efficiency
      if (isAv1) {
        // AV1 curve
        if (crf <= 15) {
          sizeRatio = 0.52;
          videoBitrate = Math.round((originalSizeMB * sizeRatio * 8192) / durationSec - audioBitrate);
        } else if (crf <= 20) {
          sizeRatio = 0.42;
          videoBitrate = Math.round((originalSizeMB * sizeRatio * 8192) / durationSec - audioBitrate);
        } else if (crf <= 25) {
          sizeRatio = 0.32;
          videoBitrate = Math.round((originalSizeMB * sizeRatio * 8192) / durationSec - audioBitrate);
        } else if (crf <= 30) {
          sizeRatio = 0.23;
          videoBitrate = Math.round((originalSizeMB * sizeRatio * 8192) / durationSec - audioBitrate);
        } else {
          sizeRatio = 0.15;
          videoBitrate = Math.round((originalSizeMB * sizeRatio * 8192) / durationSec - audioBitrate);
        }
      } else if (isHevc) {
        if (crf <= 18) {
          sizeRatio = 0.58;
          videoBitrate = Math.round((originalSizeMB * sizeRatio * 8192) / durationSec - audioBitrate);
        } else if (crf <= 23) {
          sizeRatio = 0.42;
          videoBitrate = Math.round((originalSizeMB * sizeRatio * 8192) / durationSec - audioBitrate);
        } else if (crf <= 28) {
          sizeRatio = 0.30;
          videoBitrate = Math.round((originalSizeMB * sizeRatio * 8192) / durationSec - audioBitrate);
        } else {
          sizeRatio = 0.18;
          videoBitrate = Math.round((originalSizeMB * sizeRatio * 8192) / durationSec - audioBitrate);
        }
      } else {
        // H.264
        if (crf <= 18) {
          sizeRatio = 0.70;
          videoBitrate = Math.round((originalSizeMB * sizeRatio * 8192) / durationSec - audioBitrate);
        } else if (crf <= 23) {
          sizeRatio = 0.52;
          videoBitrate = Math.round((originalSizeMB * sizeRatio * 8192) / durationSec - audioBitrate);
        } else {
          sizeRatio = 0.35;
          videoBitrate = Math.round((originalSizeMB * sizeRatio * 8192) / durationSec - audioBitrate);
        }
      }
    } else {
      // Bitrate mode
      videoBitrate = targetBitrateKbps;
      const totalMb = ((videoBitrate + audioBitrate) * durationSec) / 8192;
      sizeRatio = totalMb / originalSizeMB;
    }

    videoBitrate = Math.max(100, videoBitrate);
    const estMb = Math.max(1, ((videoBitrate + audioBitrate) * durationSec) / 8192);
    const savings = Math.max(0, Math.round(((originalSizeMB - estMb) / originalSizeMB) * 100));

    // VMAF & Visual Loss Math Formulation
    let vmaf = 96.0;
    if (isAv1) {
      vmaf = Math.max(60, Math.min(99.4, 100 - Math.pow(Math.max(0, crf - 10), 1.35) * 0.45));
    } else if (isHevc) {
      vmaf = Math.max(55, Math.min(99.0, 100 - Math.pow(Math.max(0, crf - 12), 1.38) * 0.52));
    } else {
      vmaf = Math.max(50, Math.min(98.5, 100 - Math.pow(Math.max(0, crf - 12), 1.42) * 0.60));
    }

    const visualLoss = Math.max(0.1, Number((100 - vmaf).toFixed(1)));
    const bpp = Number((videoBitrate * 1000) / (width * height * fps)).toFixed(3);

    // Fidelity Tier
    let level: { text: string; color: 'emerald' | 'cyan' | 'amber' | 'rose'; desc: string } = {
      text: 'Stüdyo Master (Gözle Ayırt Edilemez Transparan)',
      color: 'emerald',
      desc: 'İnsan gözüyle orijinal master dosya arasında hiçbir fark görünmez.',
    };

    if (vmaf >= 96.5) {
      level = {
        text: 'Stüdyo Master (Gözle Ayırt Edilemez Transparan)',
        color: 'emerald',
        desc: 'İnsan gözüyle orijinal master dosya arasında sıfır fark. Çizgiler ve renk geçişleri kusursuz.',
      };
    } else if (vmaf >= 92.0) {
      level = {
        text: 'Mükemmel Görsel Kalite (Fansub Standardı)',
        color: 'cyan',
        desc: 'Görsel kalite çok yüksek, sıkıştırma verimliliği mükemmel.',
      };
    } else if (vmaf >= 85.0) {
      level = {
        text: 'Dengeli Kalite (Yüksek Tasarruf, Hafif Kayıp)',
        color: 'amber',
        desc: 'Karanlık veya çok hızlı aksiyon sahnelerinde çok hafif detay kaybı olabilir.',
      };
    } else {
      level = {
        text: 'Agresif Sıkıştırma (Görsel Kayıp Mevcut)',
        color: 'rose',
        desc: 'Dosya boyutu minimuma iner, ince çizgilerde ve gradientlerde kayıplar oluşabilir.',
      };
    }

    return {
      estimatedVideoBitrateKbps: videoBitrate,
      estimatedOutputMB: estMb,
      savingsPercentage: savings,
      vmafScore: Number(vmaf.toFixed(1)),
      visualLossPercentage: visualLoss,
      bitsPerPixel: bpp,
      fidelityLevel: level,
    };
  }, [
    encoder,
    rateControlMode,
    crf,
    targetBitrateKbps,
    originalSizeMB,
    durationSec,
    audioBitrate,
    width,
    height,
    fps,
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
        setSuccessMsg('Video stüdyo kalitesinde başarıyla sıkıştırıldı!');
      } else if (prog.status === 'error') {
        setIsCompressing(false);
        setIsPaused(false);
        setErrorMsg('Sıkıştırma sırasında hata oluştu. Konsol sekmesinden detayları görebilirsiniz.');
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

  // Start Compression Execution
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
      const outPath = `${outDir}${sep}${baseName}_compressed_${encoder}_crf${crf}.${targetContainer}`;
      setFinalOutputPath(outPath);

      const pixFmt = is10Bit ? 'yuv420p10le' : 'yuv420p';

      const config: EncodeJobConfig = {
        id: jobId,
        input_path: sourceFile,
        output_path: outPath,
        container: targetContainer,
        encoder: encoder,
        threads: hardware?.cpu_threads || 0,
        use_bitrate: rateControlMode === 'bitrate',
        average_bitrate_kbps: estimatedVideoBitrateKbps,
        crf: crf,
        preset: encoderPreset,
        pixel_format: pixFmt,
        b_frames: bFrames,
        custom_video_args: null,
        audio_track_index: 0,
        audio_codec: audioCodec,
        audio_bitrate_kbps: audioBitrate,
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

  const formatBytes = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex-1 bg-surface-container-lowest flex flex-col h-full overflow-y-auto select-none p-6 space-y-6">
      {/* Top Banner */}
      <div className="pb-4 border-b border-outline-variant flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-white flex items-center space-x-2">
            <Minimize2 className="w-5 h-5 text-white" />
            <span>Akıllı Video Sıkıştırıcı & Stüdyo Master İstasyonu</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Gelişmiş 10-Bit AV1/HEVC motoru, dinamik VMAF görüntü kaybı analizi ve tam parametrik kontrol.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-[11px] font-mono text-neutral-300 bg-surface-container px-3 py-1.5 rounded-lg border border-outline-variant">
          <Cpu className="w-3.5 h-3.5 text-white" />
          <span>Donanım: {hardware?.gpus?.[0]?.name || hardware?.cpu_name || 'CPU Standard'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Source Video & Studio Controls (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Source Video Dropzone */}
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
                onClick={handleSelectSource}
                value={sourceFile || 'Sıkıştırmak istediğiniz videoyu seçin veya buraya sürükleyin...'}
                className="flex-1 bg-surface-container-high text-neutral-200 text-xs rounded-xl border border-outline-variant px-3.5 py-2.5 font-mono truncate cursor-pointer hover:border-white/40 transition"
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

            {/* Video Specs Breakdown */}
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
                    {metadata.duration_formatted}
                  </div>
                </div>
                <div className="bg-surface-container-high/60 p-2 rounded-lg border border-outline-variant/40">
                  <div className="text-[10px] text-neutral-400 font-medium uppercase">Çözünürlük</div>
                  <div className="text-xs font-mono font-bold text-white mt-0.5">
                    {width}x{height}
                  </div>
                </div>
                <div className="bg-surface-container-high/60 p-2 rounded-lg border border-outline-variant/40">
                  <div className="text-[10px] text-neutral-400 font-medium uppercase">Girdi Codec</div>
                  <div className="text-xs font-mono font-bold text-white mt-0.5 uppercase truncate">
                    {metadata.video_stream?.codec || 'Bilinmiyor'}
                  </div>
                </div>
              </div>
            ) : isProbing ? (
              <div className="mt-3 text-xs text-neutral-400 font-mono animate-pulse">
                Video analiz ediliyor...
              </div>
            ) : null}

            {probeError && (
              <div className="mt-3 p-2.5 rounded-lg bg-danger/10 border border-danger/20 text-xs text-danger flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{probeError}</span>
              </div>
            )}
          </div>

          {/* Studio Preset Master Profiles */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-white" />
                <span>Stüdyo Master Profilleri</span>
              </label>
              <span className="text-[11px] text-neutral-400 font-mono">
                Profesyonel Standartlar
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {STUDIO_PRESETS.map((p) => {
                const Icon = p.icon;
                const isSelected = selectedPresetId === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => !isCompressing && handleSelectPreset(p)}
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

          {/* Granular Compression Parameters */}
          <div className="p-5 rounded-2xl bg-surface-container border border-outline-variant space-y-5">
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-white" />
                <span>İnce Ayar & Kodlayıcı Parametreleri</span>
              </h3>
              <div className="flex bg-surface-container-high rounded-lg p-0.5 border border-outline-variant text-[11px]">
                <button
                  onClick={() => setRateControlMode('crf')}
                  className={`px-3 py-1 font-medium rounded-md transition ${
                    rateControlMode === 'crf' ? 'bg-white text-black font-bold' : 'text-neutral-400'
                  }`}
                >
                  Sabit Kalite (CRF)
                </button>
                <button
                  onClick={() => setRateControlMode('bitrate')}
                  className={`px-3 py-1 font-medium rounded-md transition ${
                    rateControlMode === 'bitrate' ? 'bg-white text-black font-bold' : 'text-neutral-400'
                  }`}
                >
                  Hedef Bitrate (ABR)
                </button>
              </div>
            </div>

            {/* CRF Slider (When rateControlMode === 'crf') */}
            {rateControlMode === 'crf' ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-white font-bold flex items-center space-x-1.5">
                    <span>CRF Kalite Değeri:</span>
                    <span className="text-emerald-400 font-mono text-sm">{crf}</span>
                  </span>
                  <span className="text-[11px] font-mono text-neutral-400">
                    {crf <= 16
                      ? '🌟 Stüdyo Master (Ultra Net)'
                      : crf <= 22
                      ? '✨ Mükemmel Görsel Kalite'
                      : crf <= 27
                      ? '🎯 Standart Fansub'
                      : '📉 Kompakt Arşiv'}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={45}
                  step={1}
                  value={crf}
                  onChange={(e) => {
                    setSelectedPresetId('custom_studio');
                    setCrf(Number(e.target.value));
                  }}
                  disabled={isCompressing}
                  className="w-full accent-white cursor-pointer"
                />
                <div className="flex justify-between text-[9px] font-mono text-neutral-500">
                  <span>0 (Saf Kayıpsız)</span>
                  <span>15 (Master)</span>
                  <span>22 (Dengeli)</span>
                  <span>28 (Hafif)</span>
                  <span>45 (Düşük)</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-white font-bold">Hedef Video Bitrate:</span>
                  <span className="text-white font-mono font-bold">{targetBitrateKbps} kbps</span>
                </div>
                <input
                  type="range"
                  min={500}
                  max={25000}
                  step={250}
                  value={targetBitrateKbps}
                  onChange={(e) => {
                    setSelectedPresetId('custom_studio');
                    setTargetBitrateKbps(Number(e.target.value));
                  }}
                  disabled={isCompressing}
                  className="w-full accent-white cursor-pointer"
                />
              </div>
            )}

            {/* Encoder Speed Preset Selector (SVT-AV1: 0 - 13 / x265 / NVENC) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
                <span>Kodlama Hız Profili (Preset)</span>
                <span className="text-[10px] font-mono text-neutral-400">
                  {encoder === 'libsvtav1' ? 'SVT-AV1 (0 - 13)' : encoder.includes('nvenc') ? 'NVENC (P1 - P7)' : 'CPU x265'}
                </span>
              </label>

              {encoder === 'libsvtav1' ? (
                <select
                  value={encoderPreset}
                  onChange={(e) => {
                    setSelectedPresetId('custom_studio');
                    setEncoderPreset(e.target.value);
                  }}
                  disabled={isCompressing}
                  className="w-full bg-surface-container-high text-white text-xs rounded-xl border border-outline-variant px-3 py-2.5 font-mono cursor-pointer"
                >
                  {SVT_AV1_PRESETS.map((p) => (
                    <option key={p.val} value={p.val}>
                      {p.label} — {p.desc}
                    </option>
                  ))}
                </select>
              ) : encoder.includes('nvenc') ? (
                <select
                  value={encoderPreset}
                  onChange={(e) => {
                    setSelectedPresetId('custom_studio');
                    setEncoderPreset(e.target.value);
                  }}
                  disabled={isCompressing}
                  className="w-full bg-surface-container-high text-white text-xs rounded-xl border border-outline-variant px-3 py-2.5 font-mono cursor-pointer"
                >
                  {NVENC_PRESETS.map((p) => (
                    <option key={p.val} value={p.val}>
                      {p.label}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={encoderPreset}
                  onChange={(e) => {
                    setSelectedPresetId('custom_studio');
                    setEncoderPreset(e.target.value);
                  }}
                  disabled={isCompressing}
                  className="w-full bg-surface-container-high text-white text-xs rounded-xl border border-outline-variant px-3 py-2.5 font-mono cursor-pointer"
                >
                  {X265_PRESETS.map((p) => (
                    <option key={p.val} value={p.val}>
                      {p.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* B-Frames & 10-Bit Settings Grid */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-outline-variant">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-300 font-medium">B-Frame Sayısı:</span>
                  <span className="text-white font-mono font-bold">{bFrames}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={16}
                  step={1}
                  value={bFrames}
                  onChange={(e) => {
                    setSelectedPresetId('custom_studio');
                    setBFrames(Number(e.target.value));
                  }}
                  disabled={isCompressing}
                  className="w-full accent-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-neutral-300 font-medium block">
                  Renk Derinliği
                </label>
                <div className="flex bg-surface-container-high rounded-xl p-1 border border-outline-variant">
                  <button
                    onClick={() => {
                      setSelectedPresetId('custom_studio');
                      setIs10Bit(true);
                    }}
                    className={`flex-1 py-1.5 text-xs font-mono rounded-lg transition ${
                      is10Bit ? 'bg-white text-black font-bold shadow' : 'text-neutral-400'
                    }`}
                  >
                    10-Bit (HDR/Banding Yok)
                  </button>
                  <button
                    onClick={() => {
                      setSelectedPresetId('custom_studio');
                      setIs10Bit(false);
                    }}
                    className={`flex-1 py-1.5 text-xs font-mono rounded-lg transition ${
                      !is10Bit ? 'bg-white text-black font-bold shadow' : 'text-neutral-400'
                    }`}
                  >
                    8-Bit Standart
                  </button>
                </div>
              </div>
            </div>

            {/* Audio Stream Configuration */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-outline-variant">
              <div className="space-y-1.5">
                <label className="text-xs text-neutral-300 font-medium flex items-center space-x-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-white" />
                  <span>Ses Formatı</span>
                </label>
                <select
                  value={audioCodec}
                  onChange={(e) => {
                    setSelectedPresetId('custom_studio');
                    setAudioCodec(e.target.value);
                  }}
                  disabled={isCompressing}
                  className="w-full bg-surface-container-high text-white text-xs rounded-xl border border-outline-variant px-3 py-2 font-mono"
                >
                  <option value="aac">AAC (Evrensel Uyumlu)</option>
                  <option value="libopus">Opus (Yüksek Kalite & Düşük Boyut)</option>
                  <option value="copy">Kopyala / Passthrough (Kayıpsız)</option>
                  <option value="flac">FLAC (Hi-Res Kayıpsız)</option>
                </select>
              </div>

              {audioCodec !== 'copy' && audioCodec !== 'flac' && (
                <div className="space-y-1.5">
                  <label className="text-xs text-neutral-300 font-medium block">
                    Ses Bitrate ({audioBitrate} kbps)
                  </label>
                  <select
                    value={audioBitrate}
                    onChange={(e) => {
                      setSelectedPresetId('custom_studio');
                      setAudioBitrate(Number(e.target.value));
                    }}
                    disabled={isCompressing}
                    className="w-full bg-surface-container-high text-white text-xs rounded-xl border border-outline-variant px-3 py-2 font-mono"
                  >
                    <option value={96}>96 kbps (Kompakt)</option>
                    <option value={128}>128 kbps (Standart)</option>
                    <option value={192}>192 kbps (Yüksek Kalite Master)</option>
                    <option value={256}>256 kbps (Stüdyo)</option>
                    <option value={320}>320 kbps (Maksimum)</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Visual Loss & VMAF Live Gauges (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Visual Loss & VMAF Telemetry Panel */}
          <div className="p-5 rounded-2xl bg-surface-container border border-outline-variant space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-white" />
                <span>Görsel Kayıp & VMAF Telemetrisi</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                -%{savingsPercentage} Tasarruf
              </span>
            </h3>

            {/* VMAF Score & Visual Loss Gauge */}
            <div className="p-4 rounded-xl bg-surface-container-high border border-outline-variant space-y-3">
              <div className="flex justify-between items-baseline">
                <div>
                  <span className="text-[10px] font-mono text-neutral-400 uppercase">Tahmini VMAF Skoru</span>
                  <div className="text-xl font-bold font-mono text-white mt-0.5 flex items-center space-x-1.5">
                    <span>{vmafScore}</span>
                    <span className="text-xs font-normal text-neutral-400">/ 100</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono text-neutral-400 uppercase">Görsel Kayıp</span>
                  <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5">
                    &lt; %{visualLossPercentage}
                  </div>
                </div>
              </div>

              {/* Visual Quality Bar */}
              <div className="space-y-1">
                <div className="h-2 w-full bg-surface-container-lowest rounded-full overflow-hidden border border-outline-variant/30 relative">
                  <div
                    className={`h-full transition-all duration-300 ${
                      vmafScore >= 95
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                        : vmafScore >= 90
                        ? 'bg-gradient-to-r from-cyan-500 to-cyan-400'
                        : vmafScore >= 80
                        ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                        : 'bg-gradient-to-r from-rose-500 to-rose-400'
                    }`}
                    style={{ width: `${vmafScore}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] font-mono text-neutral-500">
                  <span>80 (Kayıplı)</span>
                  <span>90 (Yüksek)</span>
                  <span>95 (Transparan)</span>
                  <span>100 (Kayıpsız)</span>
                </div>
              </div>

              {/* Fidelity Level Badge */}
              <div className="pt-2 border-t border-outline-variant/50 flex items-start space-x-2.5">
                <div
                  className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${
                    fidelityLevel.color === 'emerald'
                      ? 'bg-emerald-400 shadow-md shadow-emerald-400/50'
                      : fidelityLevel.color === 'cyan'
                      ? 'bg-cyan-400 shadow-md shadow-cyan-400/50'
                      : fidelityLevel.color === 'amber'
                      ? 'bg-amber-400 shadow-md shadow-amber-400/50'
                      : 'bg-rose-400 shadow-md shadow-rose-400/50'
                  }`}
                />
                <div className="text-xs">
                  <div className="font-bold text-white">{fidelityLevel.text}</div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">{fidelityLevel.desc}</div>
                </div>
              </div>
            </div>

            {/* Before vs After Visual Comparison Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-surface-container-high border border-outline-variant">
                <div className="text-[10px] text-neutral-400 font-mono uppercase">Orijinal Boyut</div>
                <div className="text-base font-bold font-mono text-white mt-1">
                  {formatBytes(originalSizeMB * 1024 * 1024)}
                </div>
                <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
                  Girdi: {metadata?.video_stream?.bitrate ? `${Math.round(metadata.video_stream.bitrate / 1000)} kbps` : 'Kaynak Bitrate'}
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
                  Tahmini: ~{estimatedVideoBitrateKbps} kbps
                </div>
              </div>
            </div>

            {/* Density & Technical Metrics */}
            <div className="grid grid-cols-2 gap-2 text-center text-[10px] font-mono text-neutral-300">
              <div className="bg-surface-container-high/60 p-2 rounded-lg border border-outline-variant/40">
                <span className="text-neutral-500 block">Piksel Başına Bit (bpp)</span>
                <span className="font-bold text-white">{bitsPerPixel} bpp</span>
              </div>
              <div className="bg-surface-container-high/60 p-2 rounded-lg border border-outline-variant/40">
                <span className="text-neutral-500 block">Sıkıştırma Oranı</span>
                <span className="font-bold text-white">{((originalSizeMB / estimatedOutputMB) || 1).toFixed(2)}x</span>
              </div>
            </div>

            {/* Hardware Encoder Override Selector */}
            <div className="space-y-2 pt-2 border-t border-outline-variant">
              <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
                <span>Kodlayıcı Motoru (Encoder)</span>
                <span className="text-[10px] font-mono text-neutral-400">
                  {encoder.includes('nvenc') || encoder.includes('amf') || encoder.includes('qsv') || encoder.includes('vaapi')
                    ? '⚡ GPU Hızlandırma'
                    : '🖥️ Çok Çekirdekli CPU'}
                </span>
              </label>

              <select
                value={encoder}
                onChange={(e) => {
                  setSelectedPresetId('custom_studio');
                  setEncoder(e.target.value);
                }}
                disabled={isCompressing}
                className="w-full bg-surface-container-high text-white text-xs rounded-xl border border-outline-variant px-3 py-2.5 font-mono cursor-pointer disabled:opacity-50"
              >
                <optgroup label="AV1 Codec (Yeni Nesil En Yüksek Verim)">
                  {hardware?.supported_encoders.some((e) => e.id === 'av1_nvenc' && e.is_available) && (
                    <option value="av1_nvenc">av1_nvenc (NVIDIA GPU AV1)</option>
                  )}
                  {hardware?.supported_encoders.some((e) => e.id === 'av1_amf' && e.is_available) && (
                    <option value="av1_amf">av1_amf (AMD Radeon GPU AV1)</option>
                  )}
                  <option value="libsvtav1">libsvtav1 (SVT-AV1 CPU 10-Bit - Tavsiye Edilen)</option>
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
                  <option value="libx265">libx265 (x265 CPU 10-Bit - Anime Optimize)</option>
                </optgroup>

                <optgroup label="H.264 / AVC (Maksimum Cihaz Uyumluluğu)">
                  {hardware?.supported_encoders.some((e) => e.id === 'h264_nvenc' && e.is_available) && (
                    <option value="h264_nvenc">h264_nvenc (NVIDIA GPU H.264)</option>
                  )}
                  {hardware?.supported_encoders.some((e) => e.id === 'h264_amf' && e.is_available) && (
                    <option value="h264_amf">h264_amf (AMD Radeon GPU H.264)</option>
                  )}
                  <option value="libx264">libx264 (H.264 CPU Standart)</option>
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

            {/* Live Progress Card */}
            {isCompressing && progress && (
              <div className="p-4 rounded-xl bg-surface-container-high border border-outline-variant space-y-3 animate-in fade-in-0 duration-200">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-white flex items-center space-x-1.5">
                    <Flame className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
                    <span>Kodlanıyor & Sıkıştırılıyor...</span>
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

            {/* Action Buttons */}
            <div className="pt-2 flex space-x-2">
              {!isCompressing ? (
                <button
                  onClick={handleStartCompression}
                  disabled={!sourceFile || isProbing}
                  className="w-full flex items-center justify-center space-x-2 bg-white hover:bg-neutral-200 disabled:opacity-50 text-black py-3.5 rounded-xl font-bold text-xs shadow-lg shadow-white/10 transition cursor-pointer"
                >
                  <Zap className="w-4 h-4 fill-black" />
                  <span>Stüdyo Sıkıştırmayı Başlat</span>
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

            {/* Notifications */}
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
