import React, { useState, useEffect, useMemo } from 'react';
import {
  Folder,
  Sliders,
  Sparkles,
  Play,
  PlayCircle,
  AlertTriangle,
  Loader2,
  Tv,
} from 'lucide-react';
import {
  AiModelInfo,
  EncodeJobConfig,
  HardwareProfile,
  QueueItem,
} from '../types';
import {
  getModelsList,
  selectOutputDirectory,
} from '../services/tauri';
import {
  Button,
  Input,
  Select,
  Card,
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
  const [downloadError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'encode' | 'ai'>('encode');

  const metadata = selectedItem?.metadata;

  useEffect(() => {
    getModelsList().then(setAvailableModels).catch(console.error);
  }, []);

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

  const presetSelectOptions = useMemo(() => {
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
  }, [config.encoder]);
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
    <div className="flex-1 bg-surface-container-low flex flex-col h-full overflow-y-auto select-none p-4 space-y-4">
      {/* View Header */}
      <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded-lg bg-white/10 text-white border border-white/20">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-xs font-bold text-white uppercase tracking-wider font-display">
              Kodlama Denetçisi
            </h1>
            <p className="text-[10px] text-neutral-400">
              GPU encoder, AI upscale ve filtreler
            </p>
          </div>
        </div>

        {selectedItem && (
          <div className="flex items-center space-x-1.5 bg-surface-container px-2.5 py-1 rounded-md border border-outline-variant text-[11px] font-mono text-white">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="font-bold truncate max-w-[120px]">{selectedItem.fileName}</span>
          </div>
        )}
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex p-1 bg-surface-container-highest rounded-lg border border-outline-variant">
        <button
          type="button"
          onClick={() => setActiveSection('encode')}
          className={`flex-1 py-1.5 px-3 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeSection === 'encode'
              ? 'bg-white text-black shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Tv className="w-3.5 h-3.5" />
          <span>Format & Encoder</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('ai')}
          className={`flex-1 py-1.5 px-3 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeSection === 'ai'
              ? 'bg-white text-black shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI & Filtreler</span>
        </button>
      </div>

      {/* SECTION 1: CORE ENCODE PARAMETERS */}
      {activeSection === 'encode' && (
        <div className="space-y-4 animate-in fade-in-0 duration-150">
          <Card variant="default" padding="md" className="space-y-4 bg-surface-container border border-outline-variant/60">
            <h2 className="text-xs font-bold text-white tracking-wider uppercase flex items-center space-x-2 pb-2.5 border-b border-outline-variant/40 font-display">
              <Tv className="w-3.5 h-3.5 text-white" />
              <span>Format & Kodlayıcı</span>
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
                className="w-4 h-4 rounded bg-surface-container-high border-outline-variant text-white focus:ring-0 cursor-pointer"
              />
              <label htmlFor="useBitrate" className="text-xs text-neutral-300 select-none cursor-pointer">
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
              options={presetSelectOptions}
              size="sm"
            />

            {/* CRF */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400 font-medium">Kalite (CRF/CQ)</span>
                <span className="font-mono font-bold text-white bg-white/10 px-2 py-0.5 rounded border border-white/20">
                  {config.crf}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="51"
                value={config.crf}
                onChange={(e) => setConfig((prev) => ({ ...prev, crf: parseInt(e.target.value, 10) }))}
                className="w-full h-1.5 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-white"
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
                ? metadata.audio_streams.map((a) => ({
                    value: a.audio_index.toString(),
                    label: `Parça ${a.audio_index + 1}: ${a.title || a.language || a.codec} (${a.channels}ch)`,
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
                { value: 'aac', label: 'aac (Önerilen: 320k Yüksek Kalite)' },
                { value: 'copy', label: 'copy (Kayıpsız / Orijinal Akış)' },
                { value: 'flac', label: 'flac (Stüdyo Kayıpsız FLAC)' },
                { value: 'libopus', label: 'opus (Modern Düşük Bitrate)' },
              ]}
              size="sm"
            />

            {/* CPU Threads */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400 font-medium">CPU Çekirdekleri</span>
                <span className="font-mono font-bold text-white bg-white/10 px-2 py-0.5 rounded border border-white/20">
                  {config.threads === 0 ? 'Otomatik' : `${config.threads} Thread`}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max={hardware?.cpu_threads || 16}
                value={config.threads}
                onChange={(e) => setConfig((prev) => ({ ...prev, threads: parseInt(e.target.value, 10) }))}
                className="w-full h-1.5 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-white"
              />
            </div>
          </Card>

          {/* Output Folder Card */}
          <Card variant="default" padding="md" className="space-y-3 bg-surface-container border border-outline-variant/60">
            <h2 className="text-xs font-bold text-white tracking-wider uppercase flex items-center space-x-2 pb-2.5 border-b border-outline-variant/40 font-display">
              <Folder className="w-3.5 h-3.5 text-white" />
              <span>Çıktı Hedef Dizini</span>
            </h2>
            <div className="flex space-x-1.5">
              <Input
                value={config.output_path || 'Varsayılan Klasör (Aynı Dizin)'}
                readOnly
                size="sm"
                variant="mono"
                className="flex-1"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={handleBrowseOutputFolder}
                leftIcon={<Folder className="w-4 h-4" />}
                aria-label="Çıkış Klasörü Seç"
              >
                Seç
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* SECTION 2: AI & FILTERS */}
      {activeSection === 'ai' && (
        <div className="space-y-4 animate-in fade-in-0 duration-150">
          <Card variant="default" padding="md" className="space-y-4 bg-surface-container border border-outline-variant/60">
            <div className="flex items-center justify-between pb-2.5 border-b border-outline-variant/40">
              <h2 className="text-xs font-bold text-white tracking-wider uppercase flex items-center space-x-2 font-display">
                <Sparkles className="w-3.5 h-3.5 text-white" />
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
                  className="w-4 h-4 rounded bg-surface-container-high border-outline-variant text-white focus:ring-0 cursor-pointer"
                />
                <label htmlFor="enableUpscale" className="text-xs font-bold text-white cursor-pointer">
                  Aktif Et
                </label>
              </div>
            </div>

            {downloadError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center space-x-2 text-xs text-red-400">
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

            {/* Upscale Note */}
            {config.model_settings.upscale_enabled && (
              <p className="text-[11px] text-neutral-400 font-mono bg-surface-container-highest/60 border border-outline-variant/40 rounded-lg px-3 py-2">
                ℹ {upscaleModeNote}
              </p>
            )}

            {/* Frame Gen & FPS */}
            <div className="pt-3 border-t border-outline-variant/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Kare İnterpolasyonu</span>
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
                  className="w-4 h-4 rounded bg-surface-container-high border-outline-variant text-white focus:ring-0 cursor-pointer"
                />
              </div>

              {config.model_settings.frame_gen_enabled && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-400 font-medium">Hedef FPS:</span>
                    <span className="font-mono font-bold text-white bg-white/10 px-2 py-0.5 rounded border border-white/20">
                      {config.model_settings.target_fps} FPS
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {fpsOptions.map((fps) => (
                      <button
                        key={fps.val}
                        type="button"
                        onClick={() => handleFpsSelect(fps.val)}
                        className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold transition-all border ${
                          config.model_settings.target_fps === fps.val
                            ? 'bg-white text-black border-white shadow-sm'
                            : 'bg-surface-container-high text-neutral-400 border-outline-variant hover:text-white'
                        }`}
                      >
                        {fps.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Filters Card */}
          <Card variant="default" padding="md" className="space-y-3 bg-surface-container border border-outline-variant/60">
            <h2 className="text-xs font-bold text-white tracking-wider uppercase flex items-center space-x-2 pb-2.5 border-b border-outline-variant/40 font-display">
              <Sliders className="w-3.5 h-3.5 text-white" />
              <span>Gelişmiş Anime Filtreleri</span>
            </h2>

            {/* Line Darkening */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <label className="text-neutral-300 font-medium">Line Darkening (Çizgi Belirginleştirme)</label>
                <span className="font-mono text-xs text-white font-bold">{config.filter_settings.line_darkening_value}</span>
              </div>
              <input
                type="range"
                min="0"
                max="255"
                value={config.filter_settings.line_darkening_value}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    filter_settings: { ...prev.filter_settings, line_darkening_value: parseInt(e.target.value, 10) },
                  }))
                }
                className="w-full h-1.5 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-white"
              />
            </div>

            {/* Sharpness */}
            <div className="space-y-1 pt-2">
              <div className="flex items-center justify-between text-xs">
                <label className="text-neutral-300 font-medium">Sharpness (Keskinlik)</label>
                <span className="font-mono text-xs text-white font-bold">{config.filter_settings.sharpness_value}</span>
              </div>
              <input
                type="range"
                min="0"
                max="255"
                value={config.filter_settings.sharpness_value}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    filter_settings: { ...prev.filter_settings, sharpness_value: parseInt(e.target.value, 10) },
                  }))
                }
                className="w-full h-1.5 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-white"
              />
            </div>
          </Card>
        </div>
      )}

      {/* PERSISTENT BOTTOM ACTION CARD */}
      <Card variant="default" padding="md" className="space-y-3 bg-surface-container border border-outline-variant/60 mt-auto">
        {/* Live Status if encoding */}
        {selectedItem?.status === 'encoding' && (
          <div className="p-2.5 rounded-lg bg-white/5 border border-white/20 space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-white font-bold flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                <span>Kodlanıyor (%{selectedItem.progress.percentage.toFixed(1)})</span>
              </span>
              <span className="text-emerald-400 font-bold">FPS: {selectedItem.progress.fps.toFixed(1)}</span>
            </div>
            <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
              <div className="h-full bg-white transition-all duration-300" style={{ width: `${selectedItem.progress.percentage}%` }} />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 pt-1">
          <Button
            variant="primary"
            size="md"
            onClick={onStartSingle}
            disabled={isEncoding || !selectedItem}
            leftIcon={<Play className="w-4 h-4" />}
            className="flex-1 font-bold text-xs"
          >
            Kodla (Encode)
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={onStartBatch}
            disabled={isEncoding}
            leftIcon={<PlayCircle className="w-4 h-4" />}
            className="flex-1 text-xs font-semibold"
          >
            Toplu Kodla
          </Button>
        </div>
      </Card>
    </div>
  );
};