import React, { useState, useEffect, useMemo } from 'react';
import {
  Folder,
  Sliders,
  Sparkles,
  Play,
  PlayCircle,
  CheckCircle2,
  Video,
  Download,
  AlertTriangle,
  Loader2,
  Tv,
  Zap,
  Clock,
} from 'lucide-react';
import {
  AiModelInfo,
  EncodeJobConfig,
  HardwareProfile,
  ModelDownloadProgress,
  QueueItem,
} from '../types';
import {
  downloadModel,
  getModelsList,
  onModelDownloadProgress,
  selectMediaFile,
  selectOutputDirectory,
} from '../services/tauri';
import {
  Button,
  Input,
  Select,
  Card,
  Badge,
  EncoderSelect,
  ResolutionPills,
} from './ui';

interface EncoderOption {
  value: string;
  label: string;
  group: string;
}

interface PillOption {
  id: string;
  label: string;
  desc: string;
}

const encoderOptions: EncoderOption[] = [
  { value: 'h264_amf', label: 'h264_amf (Önerilen: AMD AMF Hızlı)', group: 'AMD Radeon GPU (AMF)' },
  { value: 'hevc_amf', label: 'hevc_amf (AMD HEVC)', group: 'AMD Radeon GPU (AMF)' },
  { value: 'av1_amf', label: 'av1_amf (AMD AV1)', group: 'AMD Radeon GPU (AMF)' },
  { value: 'h264_nvenc', label: 'h264_nvenc', group: 'NVIDIA GPU (NVENC)' },
  { value: 'hevc_nvenc', label: 'hevc_nvenc', group: 'NVIDIA GPU (NVENC)' },
  { value: 'av1_nvenc', label: 'av1_nvenc', group: 'NVIDIA GPU (NVENC)' },
  { value: 'libx264', label: 'libx264 (H.264 CPU Standart)', group: 'CPU Standart' },
  { value: 'libx265', label: 'libx265 (HEVC 10-bit)', group: 'CPU Standart' },
  { value: 'libsvtav1', label: 'libsvtav1 (AV1 Yeni Nesil)', group: 'CPU Standart' },
  { value: 'h264_qsv', label: 'h264_qsv', group: 'Intel QuickSync (QSV)' },
  { value: 'hevc_qsv', label: 'hevc_qsv', group: 'Intel QuickSync (QSV)' },
  { value: 'h264_vaapi', label: 'h264_vaapi', group: 'Linux VAAPI' },
  { value: 'hevc_vaapi', label: 'hevc_vaapi', group: 'Linux VAAPI' },
];

const resolutionOptions: PillOption[] = [
  { id: '1080p', label: '1080p Full HD', desc: 'Standart Netlik' },
  { id: '2K', label: '2K QHD (1440p)', desc: '2560x1440 AI Upscale' },
  { id: '4K', label: '4K Ultra HD (2160p)', desc: '3840x2160 Maksimum Kalite' },
];

const fpsOptions = [
  { val: 24, label: '24 FPS', desc: 'Sinema' },
  { val: 60, label: '60 FPS', desc: 'Akıcı' },
  { val: 120, label: '120 FPS', desc: 'Ultra Akıcı' },
  { val: 144, label: '144 FPS', desc: 'Yüksek Hız' },
  { val: 240, label: '240 FPS', desc: 'Maksimum' },
];

interface EncodingViewProps {
  config: EncodeJobConfig;
  setConfig: React.Dispatch<React.SetStateAction<EncodeJobConfig>>;
  selectedItem: QueueItem | null;
  hardware: HardwareProfile | null;
  onStartSingle: () => void;
  onStartBatch: () => void;
  isEncoding: boolean;
}

export const EncodingView: React.FC<EncodingViewProps> = ({
  config,
  setConfig,
  selectedItem,
  hardware,
  onStartSingle,
  onStartBatch,
  isEncoding,
}) => {
  const [availableModels, setAvailableModels] = useState<AiModelInfo[]>([]);
  const [downloadingModelId, setDownloadingModelId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const metadata = selectedItem?.metadata;

  useEffect(() => {
    getModelsList().then(setAvailableModels).catch(console.error);

    let unlisten: (() => void) | null = null;
    onModelDownloadProgress((prog: ModelDownloadProgress) => {
      setDownloadProgress((prev) => ({
        ...prev,
        [prog.model_id]: prog.percentage,
      }));

      if (prog.status === 'completed') {
        setDownloadingModelId(null);
        getModelsList().then(setAvailableModels).catch(console.error);
      } else if (prog.status === 'error') {
        setDownloadingModelId(null);
        setDownloadError(prog.error || 'Model indirme hatası');
      }
    }).then((un) => {
      unlisten = un;
    });

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const handleDownloadModel = async (modelId: string) => {
    setDownloadingModelId(modelId);
    setDownloadError(null);
    try {
      await downloadModel(modelId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setDownloadError(msg);
      setDownloadingModelId(null);
    }
  };

  const handleBrowseOutputFolder = async () => {
    const dir = await selectOutputDirectory();
    if (dir) {
      const baseName = selectedItem ? selectedItem.fileName.replace(/\.[^/.]+$/, '') : 'Output';
      const ext = config.container || 'mp4';
      const separator = dir.includes('\\') ? '\\' : '/';
      setConfig((prev) => ({
        ...prev,
        output_path: `${dir}${separator}${baseName}_FloraSubs.${ext}`,
      }));
    }
  };

  const handleBrowseIntro = async () => {
    const intro = await selectMediaFile();
    if (intro) {
      setConfig((prev) => ({
        ...prev,
        intro_enabled: true,
        intro_video_path: intro,
      }));
    }
  };

  const findModel = (nameOrId: string) =>
    availableModels.find(
      (m) =>
        m.id.toLowerCase() === nameOrId.toLowerCase() ||
        m.filename.toLowerCase() === nameOrId.toLowerCase() ||
        m.name.toLowerCase().includes(nameOrId.toLowerCase())
    );

  const getModelCategoryGroup = (model: AiModelInfo): string => {
    const id = model.id;
    if (id.includes('SuperUltraCompact')) {
      return '⚡ Ultra Hızlı Gerçek Zamanlı (SuperUltraCompact)';
    }
    if (id.includes('Sharp') || id.includes('strong')) {
      return '🗡️ Keskin Çizgili (V3Sharp & Fallin Strong)';
    }
    if (id.includes('SD_') || id.includes('cugan') || id.includes('Restore')) {
      return '📺 SD / Retro Anime & Restorasyon';
    }
    if (id.includes('4x') || id.includes('AnimeVideo') || id.includes('AniScale') || id.includes('LD-Anime')) {
      return '🎥 4x Video & Özel Efektler (RealESRGAN & LD-Anime)';
    }
    if (id.includes('AnimeJaNai') || id.includes('Adore') || id.includes('soft') || id.includes('Anime4K')) {
      return '🌟 En Çok Tercih Edilen (AnimeJaNai V3 & Adore)';
    }
    return '📦 Diğer Modeller';
  };

  const modelSelectOptions = useMemo(() => {
    if (availableModels.length === 0) {
      return [
        {
          value: '2x_AnimeJaNai_HD_V3_Compact',
          label: 'AnimeJaNai HD V3 Compact (2x - Dengeli) [ONNX Compact] (4.6 MB)',
          group: '🌟 En Çok Tercih Edilen (AnimeJaNai V3 & Adore)',
        },
        {
          value: 'Anime4K_Upscale_HD',
          label: 'Anime4K Upscale HD [GLSL Shader] (0.04 MB)',
          group: '🌟 En Çok Tercih Edilen (AnimeJaNai V3 & Adore)',
        },
      ];
    }

    return availableModels.map((m) => {
      const group = getModelCategoryGroup(m);
      const formatBadge =
        m.format === 'glsl'
          ? 'GLSL Shader'
          : m.filename.includes('DML')
          ? 'ONNX FP16 DirectML'
          : m.filename.includes('fp16')
          ? 'ONNX FP16'
          : 'ONNX Compact';
      const statusText = m.is_downloaded ? '✓ İndirildi' : `(${m.size_mb.toFixed(1)} MB)`;
      return {
        value: m.id,
        label: `${m.name} [${formatBadge}] ${statusText}`,
        group,
      };
    });
  }, [availableModels]);
  const encoderOptionsWithAvailability = useMemo<EncoderOption[]>(
    () =>
      encoderOptions.map((e) => {
        const supported = hardware?.supported_encoders?.find((s) => s.id === e.value);
        const disabled = hardware ? !(supported?.is_available ?? false) : false;
        return {
          ...e,
          disabled,
          label: disabled ? `${e.label} — Kullanılamaz` : e.label,
        };
      }),
    [hardware]
  );

  const activeUpscaleModel = findModel(config.model_settings.upscale_model);
  const upscaleModeNote = activeUpscaleModel
    ? activeUpscaleModel.format === 'glsl'
      ? 'GPU Custom Shader (libplacebo) ile ultra hızlı video ölçekleme.'
      : `${activeUpscaleModel.name} sinir ağı modeli ile yüksek kaliteli 2K/4K Lanczos akıllı render hattı.`
    : '2K/4K Lanczos yüksek hassasiyetli akıllı ölçekleme hattı uygulanır.';
  const handleEncoderChange = (enc: string) => {
    let preset = config.preset;
    let crf = config.crf;
    if (enc.includes('amf')) {
      preset = 'speed';
      crf = 22;
    } else if (enc.includes('nvenc')) {
      preset = 'p4';
      crf = 23;
    } else if (enc.includes('x264')) {
      preset = 'slow';
      crf = 20;
    } else if (enc.includes('svtav1')) {
      preset = '6';
      crf = 24;
    }
    setConfig((prev) => ({ ...prev, encoder: enc, preset, crf }));
  };

  const handleModelChange = (modelId: string) => {
    let targetHeight = config.model_settings.target_height;
    if (modelId.startsWith('4x') || modelId.includes('4x')) {
      targetHeight = 2160;
    } else if (targetHeight === null || targetHeight === undefined) {
      targetHeight = 1440;
    }

    setConfig((prev) => ({
      ...prev,
      model_settings: {
        ...prev.model_settings,
        upscale_enabled: true,
        upscale_model: modelId,
        target_height: targetHeight,
      },
    }));
  };

  const handleResolutionSelect = (id: string) => {
    if (id === '1080p') {
      setConfig((prev) => ({
        ...prev,
        model_settings: { ...prev.model_settings, upscale_enabled: false, target_height: null },
      }));
    } else if (id === '2K') {
      setConfig((prev) => ({
        ...prev,
        model_settings: {
          ...prev.model_settings,
          upscale_enabled: true,
          upscale_model: prev.model_settings.upscale_model || '2x_AnimeJaNai_HD_V3_Compact',
          target_height: 1440,
        },
      }));
    } else if (id === '4K') {
      setConfig((prev) => ({
        ...prev,
        model_settings: {
          ...prev.model_settings,
          upscale_enabled: true,
          upscale_model: prev.model_settings.upscale_model.includes('4x')
            ? prev.model_settings.upscale_model
            : '4x-RealESRGAN-AnimeVideoV3-Compact',
          target_height: 2160,
        },
      }));
    }
  };

  const handleFpsSelect = (fps: number) => {
    setConfig((prev) => ({
      ...prev,
      model_settings: {
        ...prev.model_settings,
        frame_gen_enabled: true,
        target_fps: fps,
      },
    }));
  };

  return (
    <div className="flex-1 bg-slate-950 flex flex-col h-full overflow-y-auto select-none p-6 space-y-6">
      {/* View Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-700/50">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
              Kodlama & Yapay Zeka Stüdyosu
            </h1>
            <p className="text-xs text-slate-400">
              Video sıkıştırma, 2K/4K AI yükseltme, 255 FPS kare interpolasyonu ve anime filtreleri.
            </p>
          </div>
        </div>

        {selectedItem && (
          <div className="flex items-center space-x-2 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700/50 text-xs font-mono text-blue-400">
            <Badge variant="success" size="sm" dot>
              Hazır
            </Badge>
            <span className="font-bold truncate max-w-xs">{selectedItem.fileName}</span>
          </div>
        )}
      </div>

      {/* Two-Column Studio Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* LEFT COLUMN: ENCODE CORE PARAMETERS */}
        <div className="space-y-6">
          <Card variant="default" padding="lg" className="space-y-5">
            <h2 className="text-xs font-bold text-slate-200 tracking-wide uppercase flex items-center space-x-2 pb-3 border-b border-slate-700/50">
              <Tv className="w-4 h-4 text-blue-400" />
              <span>Kodlama Parametreleri (Encode)</span>
            </h2>

            {/* Container */}
            <Select
              label="Çıkış Türü"
              value={config.container}
              onChange={(e) => {
                const newCont = e.target.value;
                setConfig((prev) => {
                  const currentOut = prev.output_path;
                  const newOut = currentOut.replace(/\.[^/.]+$/, `.${newCont}`);
                  return { ...prev, container: newCont, output_path: newOut };
                });
              }}
              options={[
                { value: 'mp4', label: 'mp4 (Web Uyumlu + Faststart)' },
                { value: 'mkv', label: 'mkv (Matroska Kayıpsız)' },
                { value: 'webm', label: 'webm (HTML5 WebM)' },
              ]}
              size="sm"
            />

            {/* Bitrate */}
            <Input
              label="Ortalama Bitrate (kbps)"
              type="number"
              value={config.average_bitrate_kbps}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  average_bitrate_kbps: parseInt(e.target.value, 10) || 4000,
                }))
              }
              size="sm"
              variant="mono"
              placeholder="4000"
            />

            {/* Use Bitrate Checkbox */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="useBitrate"
                checked={config.use_bitrate}
                onChange={(e) => setConfig((prev) => ({ ...prev, use_bitrate: e.target.checked }))}
                className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0 cursor-pointer"
              />
              <label htmlFor="useBitrate" className="text-xs text-slate-300 select-none cursor-pointer">
                Bitrate Kullan (CRF/CQ yerine ABR modu)
              </label>
            </div>

            {/* Encoder */}
            <EncoderSelect
              value={config.encoder}
              onChange={handleEncoderChange}
              encoders={encoderOptionsWithAvailability}
              size="sm"
            />

            {/* Preset */}
            <Select
              label="Ön Ayarlar"
              value={config.preset}
              onChange={(e) => setConfig((prev) => ({ ...prev, preset: e.target.value }))}
              options={useMemo(() => {
                if (config.encoder.includes('amf')) {
                  return [
                    { value: 'speed', label: 'speed (Önerilen: En Hızlı)' },
                    { value: 'balanced', label: 'balanced (Dengeli)' },
                    { value: 'quality', label: 'quality (Yüksek Kalite)' },
                  ];
                }
                if (config.encoder.includes('nvenc')) {
                  return [
                    { value: 'p1', label: 'p1 (En Hızlı)' },
                    { value: 'p2', label: 'p2' },
                    { value: 'p3', label: 'p3' },
                    { value: 'p4', label: 'p4 (Önerilen: p4)' },
                    { value: 'p5', label: 'p5' },
                    { value: 'p6', label: 'p6 (Yüksek Kalite)' },
                    { value: 'p7', label: 'p7 (Ultra Kalite)' },
                  ];
                }
                if (config.encoder.includes('svtav1')) {
                  return [
                    { value: '4', label: '4 (Yavaş / Maksimum Sıkıştırma)' },
                    { value: '6', label: '6 (Önerilen Denge)' },
                    { value: '8', label: '8 (Hızlı)' },
                  ];
                }
                return [
                  { value: 'ultrafast', label: 'ultrafast' },
                  { value: 'superfast', label: 'superfast' },
                  { value: 'veryfast', label: 'veryfast' },
                  { value: 'faster', label: 'faster' },
                  { value: 'fast', label: 'fast' },
                  { value: 'medium', label: 'medium' },
                  { value: 'slow', label: 'slow (Önerilen: Standart)' },
                  { value: 'slower', label: 'slower' },
                  { value: 'veryslow', label: 'veryslow' },
                ];
              }, [config.encoder])}
              size="sm"
            />

            {/* CRF */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Kalite (CRF/CQ)</span>
                <span className="font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                  {config.crf}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="51"
                value={config.crf}
                onChange={(e) => setConfig((prev) => ({ ...prev, crf: parseInt(e.target.value, 10) }))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            {/* Audio Track */}
            <Select
              label="Ses Parçası"
              value={config.audio_track_index.toString()}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  audio_track_index: parseInt(e.target.value, 10) || 0,
                }))
              }
              options={metadata && metadata.audio_streams.length > 0
                ? metadata.audio_streams.map((audio) => ({
                    value: audio.audio_index.toString(),
                    label: audio.title
                      ? `${audio.title} [${audio.language.toUpperCase()}] (${audio.codec})`
                      : `Parça #${audio.audio_index + 1} [${audio.language.toUpperCase()}] (${audio.codec})`,
                  }))
                : [{ value: '0', label: 'Parça 1 (Varsayılan Ses)' }]}
              size="sm"
            />

            {/* Audio Codec */}
            <Select
              label="Ses Codec"
              value={config.audio_codec}
              onChange={(e) => setConfig((prev) => ({ ...prev, audio_codec: e.target.value }))}
              options={[
                { value: 'aac', label: 'aac (Önerilen: AAC - Web Standart)' },
                { value: 'libopus', label: 'libopus (Opus - Yüksek Kalite 128k)' },
                { value: 'copy', label: 'copy (Yeniden Kodlamadan Kopyala)' },
                { value: 'flac', label: 'flac (Kayıpsız FLAC)' },
                { value: 'mp3', label: 'mp3 (LAME MP3)' },
              ]}
              size="sm"
            />

            {/* Threads */}
            <Select
              label="CPU Çekirdekleri"
              value={config.threads.toString()}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  threads: parseInt(e.target.value, 10) || 0,
                }))
              }
              options={[
                { value: (hardware?.cpu_threads || 12).toString(), label: `⚡ Otomatik: ${hardware?.cpu_threads || 12} Çekirdek` },
                { value: '0', label: '0 (FFmpeg Dinamik)' },
                ...[1, 2, 4, 6, 8, 10, hardware?.cpu_threads || 12, 16, 24, 32].map((num) => ({
                  value: num.toString(),
                  label: `${num} Çekirdek ${num === hardware?.cpu_threads ? '🔥' : ''}`,
                })),
              ]}
              size="sm"
            />

            {/* B-Frames */}
            <Input
              label="B-Frames (Önerilen: 3-4)"
              type="number"
              min={0}
              max={16}
              value={config.b_frames}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  b_frames: parseInt(e.target.value, 10) || 4,
                }))
              }
              size="sm"
              variant="mono"
            />

            {/* Output Folder */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                Çıkış Klasörü
              </label>
              <div className="flex space-x-1.5">
                <Input
                  value={config.output_path || 'Varsayılan Klasör (Aynı Dizin)'}
                  readOnly
                  size="sm"
                  variant="mono"
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBrowseOutputFolder}
                  leftIcon={<Folder className="w-4 h-4 text-blue-400" />}
                  aria-label="Çıkış Klasörü Seç"
                >
                  Seç
                </Button>
              </div>
            </div>

            {/* Live Encoding Stopwatch / Status Banner */}
            {selectedItem?.status === 'encoding' && (
              <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-500/30 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-blue-400 font-bold flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Kodlanıyor... (%{selectedItem.progress.percentage.toFixed(1)})</span>
                  </span>
                  <span className="text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Geçen Süre: {selectedItem.progress.elapsed_formatted || '00:00:00'}</span>
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[10px] font-mono text-gray-400 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                  <div>FPS: <strong className="text-white">{selectedItem.progress.fps.toFixed(1)}</strong></div>
                  <div>Hız: <strong className="text-white">{selectedItem.progress.speed.toFixed(1)}x</strong></div>
                  <div className="text-right">Kalan: <strong className="text-amber-300">{selectedItem.progress.eta_formatted}</strong></div>
                </div>
              </div>
            )}
            {selectedItem?.status === 'completed' && (
              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between text-xs font-mono text-emerald-400">
                <span className="flex items-center gap-1.5 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Kodlama Tamamlandı!</span>
                </span>
                <span className="flex items-center gap-1 bg-emerald-900/40 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                  <Clock className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Toplam Süre: <strong className="text-white font-bold">{selectedItem.progress.elapsed_formatted || selectedItem.progress.time_formatted}</strong></span>
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-3 flex items-center space-x-3 border-t border-slate-700/50">
              <Button
                variant="primary"
                size="lg"
                onClick={onStartSingle}
                disabled={isEncoding || !selectedItem}
                leftIcon={<Play className="w-4 h-4" />}
                className="flex-1"
              >
                Kodla (Encode)
              </Button>

              <Button
                variant="secondary"
                size="lg"
                onClick={onStartBatch}
                disabled={isEncoding}
                leftIcon={<PlayCircle className="w-4 h-4 text-blue-400" />}
                className="flex-1"
              >
                Toplu Kodla (Queue)
              </Button>
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN: AI MODEL & FILTERS */}
        <div className="space-y-6">
          {/* AI UPSCALE & FRAME GEN */}
          <Card variant="default" padding="lg" className="space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/50">
              <h2 className="text-xs font-bold text-slate-200 tracking-wide uppercase flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Yapay Zeka & Upscale</span>
              </h2>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="enableUpscale"
                  checked={config.model_settings.upscale_enabled}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      model_settings: {
                        ...prev.model_settings,
                        upscale_enabled: e.target.checked,
                      },
                    }))
                  }
                  className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-purple-600 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="enableUpscale" className="text-xs font-bold text-purple-300 cursor-pointer">
                  Enable
                </label>
              </div>
            </div>

            {downloadError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center space-x-2 text-xs text-rose-400">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{downloadError}</span>
              </div>
            )}

            {/* Resolution Pills */}
            <ResolutionPills
              options={resolutionOptions}
              selectedId={
                config.model_settings.upscale_enabled
                  ? config.model_settings.target_height === 1440
                    ? '2K'
                    : '4K'
                  : '1080p'
              }
              onSelect={handleResolutionSelect}
              orientation="horizontal"
            />

            {/* Model Select */}
            <Select
              label="Yapay Zeka Modeli (Kategorize Edilmiş)"
              value={config.model_settings.upscale_model}
              onChange={(e) => handleModelChange(e.target.value)}
              options={modelSelectOptions}
              size="sm"
            />

            {/* Upscale mode honesty note */}
            {config.model_settings.upscale_enabled && (
              <p className="text-[11px] text-slate-400 font-mono bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2">
                ℹ {upscaleModeNote}
              </p>
            )}

            {/* Model Download Status */}
            {config.model_settings.upscale_enabled && (() => {
              const curModel = findModel(config.model_settings.upscale_model);
              if (!curModel) return null;
              const isDownloading = downloadingModelId === curModel.id;
              const pct = downloadProgress[curModel.id] || 0;

              return (
                <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-700/50 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-100 font-bold block">{curModel.name}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-400 font-mono">
                        {curModel.size_mb.toFixed(1)} MB
                      </span>
                      <Badge variant="default" size="sm" className="text-[9px] py-0 px-1.5 font-mono">
                        {curModel.format === 'glsl'
                          ? 'GLSL Shader'
                          : curModel.filename.includes('DML')
                          ? 'ONNX FP16 DirectML'
                          : curModel.filename.includes('fp16')
                          ? 'ONNX FP16'
                          : 'ONNX Compact'}
                      </Badge>
                    </div>
                  </div>

                  {curModel.is_downloaded ? (
                    <Badge variant="success" size="sm" dot className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      İndirildi / Hazır
                    </Badge>
                  ) : isDownloading ? (
                    <Badge variant="primary" size="sm" className="flex items-center gap-1.5 font-mono">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      %{pct.toFixed(1)}
                    </Badge>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleDownloadModel(curModel.id)}
                      leftIcon={<Download className="w-3.5 h-3.5" />}
                    >
                      İndir ({curModel.size_mb.toFixed(1)} MB)
                    </Button>
                  )}
                </div>
              );
            })()}

            {/* FRAME GENERATION */}
            <div className="pt-3 border-t border-slate-700/50 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wide flex items-center space-x-1.5">
                  <Zap className="w-3.5 h-3.5 text-blue-400" />
                  <span>Kare Oluşturma (Frame Interpolation)</span>
                </span>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="enableFrameGen"
                    checked={config.model_settings.frame_gen_enabled}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        model_settings: {
                          ...prev.model_settings,
                          frame_gen_enabled: e.target.checked,
                        },
                      }))
                    }
                    className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="enableFrameGen" className="text-xs font-bold text-blue-400 cursor-pointer">
                    Aktif
                  </label>
                </div>
              </div>

              {/* Frame Gen Model */}
              <Select
                label="Model"
                value={config.model_settings.frame_gen_model}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    model_settings: {
                      ...prev.model_settings,
                      frame_gen_model: e.target.value,
                    },
                  }))
                }
                options={[
                  { value: 'SVP', label: 'FPS Filtresi (kare çoğaltma — interpolasyon değil)' },
                  { value: 'minterpolate', label: 'minterpolate (FFmpeg hareket telafisi — gerçek ara kare)' },
                  { value: 'Rife v4.10', label: 'Rife v4.10 (deneysel etiket; fps filtresi uygulanır)' },
                  { value: 'Rife v4.6', label: 'Rife v4.6 (deneysel etiket; fps filtresi uygulanır)' },
                ]}
                size="sm"
              />

              {/* FPS Pills */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Hedef Kare Hızı (FPS):</span>
                  <span className="font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                    {config.model_settings.target_fps} FPS
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {fpsOptions.map((fps) => (
                    <Button
                      key={fps.val}
                      variant={config.model_settings.target_fps === fps.val ? 'primary' : 'ghost'}
                      size="sm"
                      className="min-w-[80px] justify-start text-left gap-2 py-2 px-3 flex-shrink-0"
                      onClick={() => handleFpsSelect(fps.val)}
                    >
                      <div className="flex-1 text-left whitespace-nowrap">
                        <div className="text-xs font-bold">{fps.label}</div>
                        <div className="text-[10px] text-slate-500">{fps.desc}</div>
                      </div>
                    </Button>
                  ))}
                </div>

                <input
                  type="range"
                  min="24"
                  max="255"
                  step="1"
                  value={config.model_settings.target_fps}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      model_settings: {
                        ...prev.model_settings,
                        target_fps: parseInt(e.target.value, 10),
                      },
                    }))
                  }
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>
            </div>
          </Card>

          {/* FILTERS */}
          <Card variant="default" padding="lg" className="space-y-5">
            <h2 className="text-xs font-bold text-slate-200 tracking-wide uppercase flex items-center space-x-2 pb-3 border-b border-slate-700/50">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>Gelişmiş Anime Filtreleri</span>
            </h2>

            {/* Line Darkening */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="lineDarken"
                    checked={config.filter_settings.line_darkening_enabled}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        filter_settings: {
                          ...prev.filter_settings,
                          line_darkening_enabled: e.target.checked,
                        },
                      }))
                    }
                    className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="lineDarken" className="text-xs text-slate-300 font-medium cursor-pointer">
                    Line Darkening (Çizgi Belirginleştirme)
                  </label>
                </div>
                <span className="font-mono text-xs text-blue-400 font-bold">
                  {config.filter_settings.line_darkening_value}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="255"
                value={config.filter_settings.line_darkening_value}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    filter_settings: {
                      ...prev.filter_settings,
                      line_darkening_value: parseInt(e.target.value, 10),
                    },
                  }))
                }
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            {/* Sharpness */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="sharpness"
                    checked={config.filter_settings.sharpness_enabled}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        filter_settings: {
                          ...prev.filter_settings,
                          sharpness_enabled: e.target.checked,
                        },
                      }))
                    }
                    className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="sharpness" className="text-xs text-slate-300 font-medium cursor-pointer">
                    Sharpness (Keskinlik)
                  </label>
                </div>
                <span className="font-mono text-xs text-blue-400 font-bold">
                  {config.filter_settings.sharpness_value}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="255"
                value={config.filter_settings.sharpness_value}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    filter_settings: {
                      ...prev.filter_settings,
                      sharpness_value: parseInt(e.target.value, 10),
                    },
                  }))
                }
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            {/* Grain */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="grain"
                    checked={config.filter_settings.grain_enabled}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        filter_settings: {
                          ...prev.filter_settings,
                          grain_enabled: e.target.checked,
                        },
                      }))
                    }
                    className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="grain" className="text-xs text-slate-300 font-medium cursor-pointer">
                    Grain (Doku & Film Paraziti)
                  </label>
                </div>
                <span className="font-mono text-xs text-blue-400 font-bold">
                  {config.filter_settings.grain_value}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={config.filter_settings.grain_value}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    filter_settings: {
                      ...prev.filter_settings,
                      grain_value: parseInt(e.target.value, 10),
                    },
                  }))
                }
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            {/* Intro Video */}
            <div className="pt-2 border-t border-slate-700/50 space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="introVideo"
                  checked={config.intro_enabled}
                  onChange={(e) => setConfig((prev) => ({ ...prev, intro_enabled: e.target.checked }))}
                  className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="introVideo" className="text-xs text-slate-300 font-medium cursor-pointer">
                  İntro Videosu Ekle (Bumper Concat)
                </label>
              </div>

              {config.intro_enabled && (
                <div className="flex space-x-1.5">
                  <Input
                    value={config.intro_video_path || 'İntro video dosyası seçilmedi...'}
                    readOnly
                    size="sm"
                    variant="mono"
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBrowseIntro}
                    leftIcon={<Video className="w-4 h-4 text-emerald-400" />}
                    aria-label="İntro Videosu Seç"
                  >
                    Seç
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};