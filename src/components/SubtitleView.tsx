import React, { useState } from 'react';
import {
  FileText,
  Download,
  FolderDown,
  Sparkles,
  FileVideo,
  Eye,
  Type,
  Folder,
  X,
} from 'lucide-react';
import type { EncodeJobConfig, QueueItem } from '../types';
import {
  extractAllSubs,
  extractFonts,
  extractSubtitle,
  saveSubtitleFile,
  selectOutputDirectory,
  selectSubtitleFile,
} from '../services/tauri';
import {
  Button,
  Card,
  Badge,
  Input,
  EmptyState,
  StatusIndicator,
} from './ui';

interface SubtitleViewProps {
  selectedItem: QueueItem | null;
  config: EncodeJobConfig;
  setConfig: React.Dispatch<React.SetStateAction<EncodeJobConfig>>;
}

export const SubtitleView: React.FC<SubtitleViewProps> = ({
  selectedItem,
  config,
  setConfig,
}) => {
  const [selectedSubIndex, setSelectedSubIndex] = useState<number>(0);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const meta = selectedItem?.metadata;

  const handleExtractSingle = async () => {
    if (!selectedItem) return;
    setIsExtracting(true);
    setStatusMsg(null);

    try {
      const defaultName = `${selectedItem.fileName.replace(/\.[^/.]+$/, '')}_sub${selectedSubIndex}.ass`;
      const savePath = await saveSubtitleFile(defaultName);
      if (savePath) {
        await extractSubtitle(selectedItem.filePath, selectedSubIndex, savePath);
        setStatusMsg({
          type: 'success',
          text: `Altyazı başarıyla kaydedildi: ${savePath}`,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatusMsg({ type: 'error', text: `Altyazı çıkarma hatası: ${msg}` });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleExtractAll = async () => {
    if (!selectedItem) return;
    setIsExtracting(true);
    setStatusMsg(null);

    try {
      const outDir = await selectOutputDirectory();
      if (outDir) {
        const results = await extractAllSubs(selectedItem.filePath, outDir);
        setStatusMsg({
          type: 'success',
          text: `${results.length} adet altyazı akışı klasöre çıkarıldı!`,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatusMsg({ type: 'error', text: `Hata: ${msg}` });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleExtractFonts = async () => {
    if (!selectedItem) return;
    setIsExtracting(true);
    setStatusMsg(null);

    try {
      const outDir = await selectOutputDirectory();
      if (outDir) {
        const res = await extractFonts(selectedItem.filePath, outDir);
        setStatusMsg({
          type: 'success',
          text: `${res.count} adet gömülü font klasöre aktarıldı!`,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatusMsg({ type: 'error', text: `Font çıkarma hatası: ${msg}` });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleBrowseExternalSub = async () => {
    const sub = await selectSubtitleFile();
    if (sub) {
      setConfig((prev) => ({
        ...prev,
        subtitle_source: 'external',
        external_subtitle_path: sub,
        resolved_subtitle_path: sub,
        hardsub_enabled: true,
      }));
      setStatusMsg({ type: 'success', text: `Harici altyazı bağlandı: ${sub}` });
    }
  };

  const handleBrowseFontsDir = async () => {
    const dir = await selectOutputDirectory();
    if (dir) {
      setConfig((prev) => ({
        ...prev,
        fonts_dir: dir,
      }));
      setStatusMsg({ type: 'success', text: `Özel font klasörü bağlandı: ${dir}` });
    }
  };

  const handleClearFontsDir = () => {
    setConfig((prev) => ({
      ...prev,
      fonts_dir: null,
    }));
    setStatusMsg({ type: 'success', text: 'Özel font klasörü temizlendi.' });
  };

  return (
    <div className="flex-1 bg-surface-container-lowest flex flex-col h-full overflow-y-auto select-none p-6 space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-outline-variant">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-white/10 text-white border border-white/20">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white uppercase tracking-wide">
              Gelişmiş Altyazı & Font İstasyonu
            </h1>
            <p className="text-xs text-neutral-400">
              Gömülü ASS/SSA altyazıları ve TTF/OTF fontları tek tıkla çıkartın, harici altyazıları bağlayın.
            </p>
          </div>
        </div>

        {selectedItem && (
          <div className="flex items-center space-x-2 bg-surface-container px-3 py-1.5 rounded-lg border border-outline-variant text-xs font-mono text-white">
            <FileVideo className="w-3.5 h-3.5 text-white" />
            <span className="font-bold truncate max-w-xs">{selectedItem.fileName}</span>
          </div>
        )}
      </div>

      {!selectedItem ? (
        <EmptyState
          icon={<FileText className="w-12 h-12 text-slate-500 opacity-60" />}
          title="Altyazı Çıkarılacak Dosya Seçilmedi"
          description="Lütfen sol menüden Ana Sayfa sekmesine dönüp bir video dosyası ekleyin veya seçin."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: SUBTITLE EXTRACTOR & TRACK PICKER */}
          <Card variant="default" padding="lg" className="space-y-5 bg-surface-container border border-outline-variant">
            <h2 className="text-xs font-bold text-white tracking-wide uppercase flex items-center space-x-2 pb-3 border-b border-outline-variant">
              <Eye className="w-4 h-4 text-white" />
              <span>Gömülü Altyazı Akışları ({meta?.subtitle_streams.length || 0})</span>
            </h2>

            {meta && meta.subtitle_streams.length > 0 ? (
              <div className="space-y-3">
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {meta.subtitle_streams.map((sub) => (
                    <div
                      key={sub.index}
                      onClick={() => setSelectedSubIndex(sub.subtitle_index)}
                      className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                        selectedSubIndex === sub.subtitle_index
                          ? 'bg-white/10 border-white text-white shadow-md shadow-white/10'
                          : 'bg-surface-container-high border-outline-variant hover:border-white/40 text-neutral-300'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold block text-white">
                          #{sub.subtitle_index + 1}: {sub.title || 'Başlıksız Altyazı'}
                        </span>
                        <span className="text-[10px] text-neutral-400 font-mono block">
                          Dil: {sub.language.toUpperCase()} • Format: {sub.codec.toUpperCase()}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        {sub.is_default && (
                          <Badge variant="primary" size="sm">
                            Default
                          </Badge>
                        )}
                        <input
                          type="radio"
                          name="subTrack"
                          checked={selectedSubIndex === sub.subtitle_index}
                          onChange={() => setSelectedSubIndex(sub.subtitle_index)}
                          className="text-white focus:ring-0 accent-white"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Extract Actions */}
                <div className="pt-2 flex items-center space-x-3">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleExtractSingle}
                    disabled={isExtracting}
                    leftIcon={<Download className="w-4 h-4" />}
                    className="flex-1"
                  >
                    Seçili Altyazıyı Çıkar (.ass)
                  </Button>

                  <Button
                    variant="secondary"
                    size="md"
                    onClick={handleExtractAll}
                    disabled={isExtracting}
                    leftIcon={<FolderDown className="w-4 h-4 text-white" />}
                    className="flex-1"
                  >
                    Tümünü Klasöre Çıkar
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">Videoda gömülü altyazı akışı bulunamadı.</p>
            )}

            {/* External Subtitle Binder */}
            <div className="pt-3 border-t border-outline-variant space-y-2">
              <span className="text-xs font-bold text-white block">Harici Altyazı Dosyası (.ass / .srt)</span>
              <div className="flex space-x-2">
                <Input
                  value={config.external_subtitle_path || 'Harici altyazı seçilmedi...'}
                  readOnly
                  size="sm"
                  variant="mono"
                  className="flex-1"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleBrowseExternalSub}
                  leftIcon={<FileText className="w-3.5 h-3.5 text-white" />}
                >
                  Seç
                </Button>
              </div>
            </div>
          </Card>

          {/* RIGHT: EMBEDDED FONT ATTACHMENTS INSPECTOR */}
          <Card variant="default" padding="lg" className="space-y-4 bg-surface-container border border-outline-variant">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
              <h2 className="text-xs font-bold text-white tracking-wide uppercase flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-white" />
                <span>Gömülü Font Ekleri ({meta?.font_count || 0})</span>
              </h2>

              {meta && meta.font_count > 0 && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleExtractFonts}
                  disabled={isExtracting}
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                >
                  Fontları Çıkar
                </Button>
              )}
            </div>

            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {meta && meta.attachments.length > 0 ? (
                meta.attachments
                  .filter((a) => a.is_font)
                  .map((att, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-surface-container-high border border-outline-variant flex items-center justify-between text-xs font-mono"
                    >
                      <div className="flex items-center space-x-2">
                        <Type className="w-3.5 h-3.5 text-white flex-shrink-0" />
                        <span className="text-neutral-200 truncate text-[11px]">{att.filename || 'font.ttf'}</span>
                      </div>
                      <span className="text-[10px] text-neutral-400 px-1.5 py-0.5 rounded bg-surface-container-lowest">
                        {att.mime_type || 'application/x-truetype-font'}
                      </span>
                    </div>
                  ))
              ) : (
                <p className="text-xs text-neutral-500 italic">MKV konteynerinde gömülü font ekleri bulunamadı.</p>
              )}
            </div>

            {/* External Custom Fonts Directory Binder */}
            <div className="pt-3 border-t border-outline-variant space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white block">Özel Font Klasörü (fontsdir)</span>
                {config.fonts_dir && (
                  <button
                    onClick={handleClearFontsDir}
                    className="text-[10px] text-danger hover:underline flex items-center space-x-1"
                  >
                    <X className="w-3 h-3" />
                    <span>Kaldır</span>
                  </button>
                )}
              </div>
              <div className="flex space-x-2">
                <Input
                  value={config.fonts_dir || 'Harici font klasörü seçilmedi (varsayılan)...'}
                  readOnly
                  size="sm"
                  variant="mono"
                  className="flex-1"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleBrowseFontsDir}
                  leftIcon={<Folder className="w-3.5 h-3.5 text-white" />}
                >
                  Klasör Seç
                </Button>
              </div>
              <p className="text-[10px] text-neutral-400">
                ASS altyazılarında kullanılan özel .ttf/.otf fontların bulunduğu klasörü seçin.
              </p>
            </div>

            {statusMsg && (
              <div
                className={`p-3 rounded-xl flex items-center space-x-2 text-xs font-medium ${
                  statusMsg.type === 'success'
                    ? 'bg-white/10 border border-white/20 text-white'
                    : 'bg-danger/10 border border-danger/30 text-danger'
                }`}
              >
                <StatusIndicator status={statusMsg.type === 'success' ? 'success' : 'error'} size="sm" />
                <span>{statusMsg.text}</span>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};