import React, { useState } from 'react';
import { Settings, Cpu, HardDrive, ShieldCheck, Check, Folder } from 'lucide-react';
import { HardwareProfile } from '../types';
import { selectOutputDirectory } from '../services/tauri';

interface SettingsViewProps {
  hardware: HardwareProfile | null;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ hardware }) => {
  const [defaultOutput, setDefaultOutput] = useState<string>(
    () => localStorage.getItem('florasubs_default_output') || ''
  );
  const [hardwareAccel, setHardwareAccel] = useState<boolean>(true);
  const [saved, setSaved] = useState<boolean>(false);

  const handleSelectDefaultOutput = async () => {
    const dir = await selectOutputDirectory();
    if (dir) {
      setDefaultOutput(dir);
      localStorage.setItem('florasubs_default_output', dir);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <div className="flex-1 bg-surface-container-lowest flex flex-col h-full overflow-y-auto select-none p-8 space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-outline-variant">
        <h1 className="text-base font-bold text-white flex items-center space-x-2">
          <Settings className="w-5 h-5 text-white" />
          <span>FloraSubs Tercihleri & Donanım Ayarları</span>
        </h1>
        <p className="text-xs text-neutral-400 mt-1">
          Donanım hızlandırma öncelikleri, varsayılan kayıt yolları ve motor yapılandırması.
        </p>
      </div>
      <div className="max-w-3xl space-y-6">
        {/* Hardware Status Card */}
        <div className="p-6 rounded-2xl bg-surface-container border border-outline-variant space-y-4">
          <h2 className="text-xs font-bold text-white uppercase tracking-wide flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-white" />
            <span>Tespit Edilen GPU & Kodlayıcı Durumu</span>
          </h2>

          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-surface-container-high border border-outline-variant flex items-center justify-between text-xs">
              <div>
                <span className="text-neutral-400 block text-[11px]">Sistem GPU Aygıtı:</span>
                <span className="font-bold text-white font-mono">
                  {hardware?.gpus?.[0]?.name || 'Standart Grafik Birimi'}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-white/10 text-white text-[10px] font-bold border border-white/20">
                Aktif & Hazır
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-container-high border border-outline-variant flex items-center justify-between text-xs">
              <div>
                <span className="text-neutral-400 block text-[11px]">FFmpeg Sürümü:</span>
                <span className="font-bold text-white font-mono">
                  {hardware?.ffmpeg_version || 'Gömülü Static FFmpeg 7.x (libass + svtav1 + nvenc + amf)'}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-white/10 text-white text-[10px] font-bold border border-white/20">
                Gömülü Motor
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-container-high border border-outline-variant flex items-center justify-between text-xs">
              <div>
                <span className="text-neutral-400 block text-[11px]">Önerilen Donanımsal Kodlayıcı:</span>
                <span className="font-bold text-white font-mono">
                  {hardware?.recommended_encoder || 'libx264'}
                </span>
              </div>
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>

        {/* General Preferences */}
        <div className="p-6 rounded-2xl bg-surface-container border border-outline-variant space-y-4">
          <h2 className="text-xs font-bold text-white uppercase tracking-wide flex items-center space-x-2">
            <HardDrive className="w-4 h-4 text-white" />
            <span>Genel Tercihler</span>
          </h2>

          <div className="space-y-4">
            {/* Default Output Folder */}
            <div className="space-y-1.5">
              <label className="text-xs text-neutral-400 font-medium">Varsayılan Çıktı Klasörü</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  readOnly
                  value={defaultOutput || 'Kaynak video ile aynı klasör (Varsayılan)'}
                  className="flex-1 bg-surface-container-high text-neutral-200 text-xs rounded-lg border border-outline-variant px-3 py-2 font-mono truncate"
                />
                <button
                  onClick={handleSelectDefaultOutput}
                  className="p-2 bg-surface-container-highest hover:bg-neutral-700 text-white rounded-lg border border-outline-variant"
                  title="Klasör Seç"
                >
                  <Folder className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            {/* Hardware Accel Toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-outline-variant">
              <div>
                <span className="text-xs font-bold text-white block">GPU Donanım Hızlandırması Önceliği</span>
                <span className="text-[11px] text-neutral-400 block">
                  NVENC, AMF, QSV veya VAAPI tespit edildiğinde otomatik olarak GPU moduna geçer.
                </span>
              </div>
              <input
                type="checkbox"
                checked={hardwareAccel}
                onChange={(e) => setHardwareAccel(e.target.checked)}
                className="w-4 h-4 rounded bg-surface-container-high border-outline-variant text-white focus:ring-0 cursor-pointer accent-white"
              />
            </div>
          </div>
        </div>

        {saved && (
          <div className="p-3 rounded-xl bg-white/10 border border-white/20 flex items-center space-x-2 text-xs text-white">
            <Check className="w-4 h-4 text-white" />
            <span>Ayarlar başarıyla kaydedildi!</span>
          </div>
        )}
      </div>
    </div>
  );
};
