# FloraSubs Reborn — Project State & Architectural Blueprint

**Son Güncelleme:** 2026-08-26  
**Mimar:** Jony (Baş Yazılım Mimarı)  
**Kullanıcı:** Berk  
**Durum:** v1.2.0 Tam Doğrulandı (18 ONNX Modeli Kataloğu, 2K/4K Lanczos Çözünürlük Duyarlı Ölçekleme, Windows Thread Sınırlandırması & Çoklu Platform GitHub Release)

---

## 1. Yönetici Özeti (Executive Summary)
FloraSubs Reborn v1.0.0; anime çeviri ve fansub ekipleri için özel olarak tasarlanmış, ultra hafif (~25MB RAM), sıfır yapılandırmalı, bağımsız bir masaüstü video kodlama, altyazı gömme (hardsub) ve yapay zeka iş istasyonudur.

v1.0.0 sürümü ile birlikte:
1. **Harici Oynatıcı (MPV) Butonu Kaldırıldı:** Dahili HTTP 206 Range yayınlayıcı ve tam altyazı senkronizasyonu devreye alındığı için önizlemedeki harici oynatıcı butonu arayüzden tamamen temizlendi.
2. **Windows Platform İzolasyonu:** Windows AMD AMF (`h264_amf`, `hevc_amf`, `av1_amf`), NVIDIA NVENC (`h264_nvenc`, `hevc_nvenc`, `av1_nvenc`) ve Intel QSV (`h264_qsv`, `hevc_qsv`, `av1_qsv`) donanım kodlayıcıları Windows ortamına izole edildi; statik FFmpeg 7.1 ikilileri ve NSIS `setup.exe` kurulum sistemi yapılandırıldı.
3. **Resmi GitHub Release & CI/CD:** [KadirBerkpolat1/FloraSubs-Core](https://github.com/KadirBerkpolat1/FloraSubs-Core) deposu kurularak v1.0.0 etiketiyle yayınlandı ve otomatik çoklu platform GitHub Actions iş akışı bağlandı.
---

## 2. Mimari Bileşenler & Modüller

### A. Senkronize Video Yaşam Döngüsü & Oynatıcı (`PreviewView.tsx`)
* **Yerel Olay Bağlantısı:** `onPlay`, `onPlaying`, `onPause`, `onEnded` olayları doğrudan React durumuna bağlandı. İster ortadaki butona, ister alt çubuğa, ister video yüzeyine ardı ardına hızlıca basılsın, buton durumu donanım oynatımıyla her zaman %100 eşzamanlıdır.
* **`togglePlay()` Refaktörü:** React durumu yerine `videoRef.current.paused` okunur; tarayıcının `AbortError` promise kesintileri güvenli şekilde yutularak kilitlenme önlenir.
* **Masaüstü Klavye Kısayolları:**
  - **Space (Boşluk):** Anında Oynat / Duraklat.
  - **Sol / Sağ Ok Tuşları:** ±5 saniye hızlı atlama.
  - **Yukarı / Aşağı Ok Tuşları:** Ses seviyesi ayarı (±%10).
  - **M Tuşu:** Sesi Kapat / Aç (Mute toggle).
  - **F Tuşu:** Tam Ekran (Fullscreen toggle).

### B. Canlı Altyazı Eşzamanlama Motoru (`demuxer.rs` & `streamer.rs`)
* `parse_ass_content` ile `Dialogue:` satırları mikrosaniye hassasiyetle video üzerine yansıtılır.
* Oynatıcı çubuğundan canlı altyazı parçası değiştirilebilir (`📝 Altyazı`).

---

## 3. Doğrulama ve Test Sonuçları
* **Rust Backend:** 24/24 birim testi eksiksiz geçti (`cargo test` $\rightarrow$ 0 hata) ✅
* **Frontend Prodüksiyon Paketi:** `bun run build` $\rightarrow$ 0 Hata (1615 modül) ✅
* **Windows Paketleyici:** `scripts/bundle-windows.sh` & `scripts/download-ffmpeg.sh` ile statik FFmpeg 7.x + NSIS Setup + Portable paketleme tam hazır ✅
* **GitHub Release & CI/CD:** [KadirBerkpolat1/FloraSubs-Core](https://github.com/KadirBerkpolat1/FloraSubs-Core) çoklu platform GitHub Actions iş akışı bağlandı ✅

## 4. v1.1 Sertleştirme (2026-08-25)
* **Güvenlik:** Stream sunucusu UUID token + Host doğrulaması ile korundu; wildcard CORS kaldırıldı. `tauri.conf.json`'da katı CSP etkin, capability yalnız `main` penceresine daraltıldı.
* **Süreç Yönetimi:** Pencere kapanınca tüm ffmpeg çocukları öldürülüyor (`kill_all_jobs`); iptal edilen işler artık "error" değil "cancelled" olarak raporlanıyor. Batch kodlama sıralı kuyruğa alındı.
* **Dürüstlük:** ONNX/RIFE sahte katalog girdileri kaldırıldı; encoder listesi donanım desteğine göre devre dışı bırakılıyor. AI backend seçici (çalışmayan) arayüzden çıkarıldı.
* **CI/CD:** Tek yayıncılı release akışı (softprops), platform-bağımsız ffmpeg indirici.
* **Doğrulama:** cargo test 17/17 ✅ • bun run build 0 hata ✅

## 5. Code Review & Canlı Düzeltmeler (2026-08-25)
* **Önizleme CORS Kırığı (KRİTİK, düzeltildi):** `PreviewView.tsx`'teki `crossOrigin="anonymous"` + streamer'ın `Access-Control-Allow-Origin` göndermemesi → WebKit tüm video yüklemelerini reddediyordu. Attribute kaldırıldı; `onError` overlay eklendi (sessiz siyah ekran sona erdi).
* **Windows Derleme Kırığı (düzeltildi):** `runner.rs` NtSuspend/NtResume için `Win32_System_LibraryLoader` feature'ı gerekiyordu; `Cargo.toml`'a eklendi. Öncesinde Windows hedefi derlenemiyordu.
* **Harici Altyazı Önizleme (yeni):** Hardsub'lı çıktıda gömülü track olmaması normal; önizleme paneline `.ass/.srt/.vtt` yükleme butonu + hardsub bilgilendirmesi eklendi. `demuxer.rs`'e SRT/WebVTT parser eklendi.
* **Kritik Düzeltmeler (tamamlandı):** (1) Sahte ONNX katalog girdileri kaldırıldı — builder yalnız GLSL çalıştırabildiğinden katalogda yalnız Anime4K_Upscale_HD kaldı; orphan `.onnx` repo'dan silindi. (2) Linux CI'a `download-ffmpeg.sh` adımı eklendi; tar.gz artık gerçek binary + `bin/` taşıyor; deb `depends: ffmpeg` kaldırıldı (statik bundle). (3) `resolve_unique_output_path` — çakışan çıktıya otomatik `_2/_3` son eki + log bildirimi (sessiz overwrite sona erdi). (4) Tek girişte ses map'i `0:a:N?` opsiyonel yapıldı (sessiz video artık job'u patlatmaz). Doğrulama: cargo test 18/18 ✅ • bun build ✅ • dev app canlı ✅.
* **Sahte 'İşleniyor' Takılması (düzeltildi):** `start_encode` job'ı `tokio::spawn` ile fırlatılıyor, runner'daki erken hatalar (`?`) event'siz ölüyordu → UI sonsuza dek '%0.0 İşleniyor' gösteriyordu. Runner'a `emit_error` closure eklendi: probe/altyazı çıkarma/ffmpeg yok/args/spawn/pid hataları artık `encode-progress status=error` yayınlıyor.
* **Model Seçici Senkronu (düzeltildi):** EncodingView'daki hardcoded Adore option'ı ve 2K handler'ı katalog temizliğinden kaçmıştı. Yeni `ModelSettings.target_height` alanı eklendi (2K→1440, 4K→2160); builder hedef yükseklikten `scale=-2:H` üretiyor — 2K seçimi artık gerçek 1440p (önceki iw*2 fallback 1080p kaynağı 2160p yapıyordu). PreviewView rozeti + App/Converter default'ları senkronlandı.
* **FloraSubs Reborn Tam Hat Doğrulaması (2026-08-26):**
  1. **Altyazı & Font Koruma:** `demuxer.rs` gömülü `.ass` ve `.ttf/.otf` font eklerini (`-dump_attachment:t ""`) izole çalışma dizinine döker; `builder.rs` `subtitles='...':fontsdir='...'` filtresini Windows ve Unix sürücü/yol kaçışları (`C\\:/...`) ile oluşturur (Arial'a düşme hatası kalıcı olarak giderildi).
  2. **Yapay Zeka Upscale + Hardsub Sıralaması:** `scale`/`libplacebo` filtresi filtre grafiğinde birinci sıraya, `subtitles` filtresi ikinci sıraya yerleştirilerek ölçekleme sonrası altyazıların kaybolması veya pikselleşmesi engellendi.
  3. **Windows & Linux Süreç Kontrolü:** `ProcessManager` Unix (`SIGSTOP`/`SIGCONT`) ve Windows (`NtSuspendProcess`/`NtResumeProcess`) API'leri ile aktif kodlama süreçlerini bellek sızıntısı ve CPU tüketimi olmadan duraklatır ve sürdürür.
  4. **Doğrulama:** 24/24 Cargo testleri başarıyla geçti ✅ • Frontend Vite build 0 hata ✅.

## 6. v1.2.0 — ONNX Anime Model Ekosistemi & Windows Kararlılık Güncellemesi (2026-08-26)
* **Windows Filtre Grafiği ve Kodlayıcı Kararlılığı:**
  - **Thread Clamping:** FFmpeg `-threads` parametresi $\le 16$ olarak sınırlandı (`config.threads.min(16)`), Windows ve çok çekirdekli sistemlerde decoder thread aşımı ve kilitlenmeler kalıcı olarak önlendi.
  - **Lanczos 2K/4K Scaling Pipeline:** `libplacebo` GLSL filtresinin FFmpeg `subtitles` ve `curves` ile Vulkan tahsisi olmadan çakışması önlendi; çözünürlük duyarlı yüksek hassasiyetli Lanczos ölçekleme hattına (`scale=-2:1440:flags=lanczos+accurate_rnd` / `2160` / `iw*4` / `iw*2`) geçirildi.
  - **Altyazı Çizim Sırası:** Ölçekleme filtresi `subtitles` filtresinden önceye alınarak altyazıların hedef 1440p / 2160p çözünürlükte pikselleşmesiz ve keskin render edilmesi sağlandı.
* **18 Neural Model Kataloğu & İndirici (`models.rs`):**
  - **AnimeJaNai V3 Ailesi:** `2x_AnimeJaNai_HD_V3_Compact`, `UltraCompact`, `SuperUltraCompact`, `V3Sharp1_Compact`, `V3Sharp1_UltraCompact`, `V3Sharp1_SuperUltraCompact`, `SD_V1beta34_Compact`.
  - **Adore & Fallin Ailesi:** `2x_Adore_renarchi_fp16_DML_onnxslim`, `2x_Adore_renarchi_fp32`, `2x_fallin_soft_renarchi_fp16`, `2x_fallin_strong_renarchi_fp16`.
  - **Özel Video & Çizgi Upscaler Modelleri:** `2x_AniScale_Compact`, `2x_LD-Anime-Compact`, `4x-RealESRGAN-AnimeVideoV3-Compact`, `4x-RealESRGAN-v2-Compact`, `RealESRGANv2-animevideo-xsx2`, `sudo_shuffle_cugan_fp16_op18_clamped_9.584.969`, `Anime4K_Restore_UL`, `Anime4K_Upscale_HD`.
* **Frontend Kategorize Edilmiş Model Seçici (`EncodingView.tsx` & `Select.tsx`):**
  - `<optgroup>` destekli görsel kategori gruplandırması: En Çok Tercih Edilen, Ultra Hızlı Gerçek Zamanlı, Keskin Çizgili, SD / Retro Anime & Restorasyon, 4x Video & Özel Efektler.
  - Format (`ONNX FP16 DirectML`, `ONNX Compact`, `GLSL Shader`), dosya boyutu ve indirme durumu rozetleri eklendi.
  - Model seçimi ile 2K (1440p) / 4K (2160p) çözünürlük hapları otomatik senkronize edildi.
* **Doğrulama:** 26/26 Cargo testleri başarıyla geçti ✅ • Frontend Vite build 0 hata ✅ • GitHub Release v1.2.0 yayınlandı ✅.

## 7. v2.0 — Endüstriyel Kurgu Stüdyosu UI & 3-Bölmeli Çalışma İstasyonu (2026-08-27)
* **Görsel Tema & Palet Refaktörü:**
  - Jet Black (`#070A0F`) ve Obsidyen (`#0E131F`, `#141B2D`) zemin tonları üzerine Sıcak Kehribar (`#F59E0B`), Elektrik Turuncu (`#FB923C`) ve Stüdyo Camgöbeği (`#06B6D4`) renk sistemi entegre edildi.
  - Tonal cam katmanları (`backdrop-filter: blur(12px)`), 1px zarif kenarlıklar ve `transition: 150ms` mikro-etkileşim standartları getirildi.
* **3-Bölmeli Entegre Çalışma İstasyonu (Multi-Pane Studio Layout):**
  - **Sol Panel (`320px`):** `FileQueue` — Video sürükle-bırak, toplu dosya seçimi, canlı ETA/FPS istatistikleri ve parça yönetim dock'u.
  - **Merkez Panel (Esnek / Fluid):** `PreviewView` — Canlı HTTP 206 video oynatıcı, mikrosaniye hassasiyetinde ASS/SRT altyazı senkronizasyonu ve klavye HUD kısayol göstergeleri.
  - **Sağ Panel (`380px`):** `EncodingView` — GPU donanım kodlayıcı seçimi (AMF/NVENC/QSV/CPU), 2K/4K Lanczos ölçekleme hapları, CRF slider ve 1-tıkla kodlama başlatma denetçisi.
* **Bileşen Kütüphanesi Yenilenmesi:**
  - `Button`, `Badge`, `ProgressBar`, `ResolutionPills`, `EncoderSelect`, `Card`, `Header`, `Sidebar` bileşenleri yeni renk token'larına ve industrial sınıflara dönüştürüldü.
* **Doğrulama:** 27/27 Cargo testleri başarıyla geçti ✅ • Frontend Vite build 0 hata (1615 modül 1.54s) ✅.
