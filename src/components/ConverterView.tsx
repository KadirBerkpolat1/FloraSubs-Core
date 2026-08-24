import React, { useState, useRef } from 'react';
import { RefreshCw, FileVideo, Zap, Folder, CheckCircle2 } from 'lucide-react';
import { selectMediaFile, selectOutputDirectory, startEncode } from '../services/tauri';
import { EncodeJobConfig } from '../types';

export const ConverterView: React.FC = () => {
  const [sourceFile, setSourceFile] = useState<string | null>(null);
  const [targetContainer, setTargetContainer] = useState<string>('mp4');
  const [outputFolder, setOutputFolder] = useState<string | null>(null);
  const [isRemuxing, setIsRemuxing] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectSource = async () => {
    const file = await selectMediaFile();
    if (file) {
      setSourceFile(file);
      setSuccessMsg(null);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const f = e.target.files[0];
      const p = (f && typeof f === 'object' && 'path' in f && typeof f.path === 'string')
        ? f.path
        : f.name;
      if (p) {
        setSourceFile(p);
        setSuccessMsg(null);
      }
      e.target.value = '';
    }
  };
  const handleSelectOutput = async () => {
    const dir = await selectOutputDirectory();
    if (dir) setOutputFolder(dir);
  };

  const handleStartRemux = async () => {
    if (!sourceFile) {
      alert('Lütfen kaynak dosya seçin.');
      return;
    }

    setIsRemuxing(true);
    setSuccessMsg(null);

    try {
      const baseName = sourceFile.split(/[\\/]/).pop()?.replace(/\.[^/.]+$/, '') || 'Converted';
      const outDir = outputFolder || sourceFile.substring(0, sourceFile.lastIndexOf(/[\\/]/.exec(sourceFile)?.[0] || '/'));
      const sep = outDir.includes('\\') ? '\\' : '/';
      const outPath = `${outDir}${sep}${baseName}_remux.${targetContainer}`;

      const config: EncodeJobConfig = {
        id: `remux_${Date.now()}`,
        input_path: sourceFile,
        output_path: outPath,
        container: targetContainer,
        encoder: 'copy',
        threads: 0,
        use_bitrate: false,
        average_bitrate_kbps: 4000,
        crf: 20,
        preset: 'medium',
        pixel_format: 'yuv420p',
        b_frames: 4,
        custom_video_args: null,
        audio_track_index: 0,
        audio_codec: 'copy',
        audio_bitrate_kbps: 192,
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
      setSuccessMsg(`Hızlı dönüştürme başlatıldı! Çıktı: ${outPath}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Dönüştürme hatası: ${msg}`);
    } finally {
      setIsRemuxing(false);
    }
  };

  return (
    <div className="flex-1 bg-[#0f1117] flex flex-col h-full overflow-y-auto select-none p-8 space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-[#242938]">
        <h1 className="text-base font-bold text-gray-100 flex items-center space-x-2">
          <RefreshCw className="w-5 h-5 text-blue-400" />
          <span>Hızlı Video & Konteyner Dönüştürücü (Remux)</span>
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Yeniden kodlama (re-encode) yapmadan, kalite kaybı olmadan saniyeler içinde format değiştirin.
        </p>
      </div>

      <div className="max-w-2xl bg-[#161922] rounded-2xl border border-[#242938] p-6 space-y-6">
        {/* Source File Picker */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-300 uppercase tracking-wide">
            Kaynak Video Dosyası
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              readOnly
              value={sourceFile || 'Lütfen video dosyası seçin (.mkv, .mp4, .ts, .webm)'}
              className="flex-1 bg-[#1f2433] text-gray-300 text-xs rounded-lg border border-[#2e364a] px-3 py-2 font-mono truncate"
            />
            <input
              type="file"
              ref={fileInputRef}
              accept=".mkv,.mp4,.ts,.webm,.avi,.mov,.flv,.m4v,.m2ts"
              className="hidden"
              onChange={handleFileInputChange}
            />
            <button
              onClick={handleSelectSource}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-[#262c3e] hover:bg-[#323a50] text-gray-200 text-xs font-semibold border border-[#37405a] transition cursor-pointer"
            >
              <FileVideo className="w-4 h-4 text-blue-400" />
              <span>Gözat</span>
            </button>
          </div>
        </div>
        {/* Target Format Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-300 uppercase tracking-wide">
            Hedef Konteyner Formatı
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'mp4', label: 'MP4 (Web & Faststart)', desc: 'Tüm tarayıcılar ve cihazlar' },
              { id: 'mkv', label: 'MKV (Matroska)', desc: 'Çoklu altyazı ve ses desteği' },
              { id: 'webm', label: 'WebM', desc: 'Açık web standardı' },
            ].map((fmt) => (
              <button
                key={fmt.id}
                onClick={() => setTargetContainer(fmt.id)}
                className={`p-3 rounded-xl border text-left transition ${
                  targetContainer === fmt.id
                    ? 'bg-blue-600/20 border-blue-500/60 shadow-lg shadow-blue-500/10'
                    : 'bg-[#1f2433] border-[#2e364a] hover:bg-[#283044]'
                }`}
              >
                <span className="text-xs font-bold text-white block">{fmt.label}</span>
                <span className="text-[10px] text-gray-400 block mt-1">{fmt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Output Directory */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-300 uppercase tracking-wide">
            Çıktı Klasörü
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              readOnly
              value={outputFolder || 'Kaynak dosya ile aynı klasör'}
              className="flex-1 bg-[#1f2433] text-gray-300 text-xs rounded-lg border border-[#2e364a] px-3 py-2 font-mono truncate"
            />
            <button
              onClick={handleSelectOutput}
              className="p-2 bg-[#262c3e] hover:bg-[#323a50] text-gray-200 rounded-lg border border-[#37405a] transition"
              title="Klasör Seç"
            >
              <Folder className="w-4 h-4 text-blue-400" />
            </button>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            onClick={handleStartRemux}
            disabled={!sourceFile || isRemuxing}
            className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white py-3 rounded-xl font-bold text-xs shadow-lg shadow-blue-600/30 transition cursor-pointer"
          >
            <Zap className="w-4 h-4" />
            <span>{isRemuxing ? 'Dönüştürülüyor...' : 'Anında Dönüştür (Stream Copy)'}</span>
          </button>
        </div>

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center space-x-2 text-xs text-emerald-400">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
};
