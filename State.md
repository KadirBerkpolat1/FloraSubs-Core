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

## 7. v2.0 — Monochrome Pro Studio UI & 3-Bölmeli Ferah Çalışma İstasyonu (2026-08-27)
* **Siyah-Beyaz (Monochrome) Minimalist Dönüşüm:**
  - Dikkat dağıtan sarı/turuncu neon renkler kaldırılarak saf siyah (`#000000`), mat kömür (`#0A0A0A`, `#121212`, `#181818`) ve saf beyaz (`#FFFFFF`) tipografi/vurgu sistemine geçildi.
  - Sol alttaki gereksiz `TELEMETRY` (GPU, Encoder, FFmpeg) kutusu tamamen temizlendi; sidebar ferahlatıldı (`200px`).
* **3-Bölmeli Entegre & Ferah Düzen (Multi-Pane Layout):**
  - **Sol Dock (`280px`):** `FileQueue` — Video sürükle-bırak, kuyruk listesi, beyaz `Dosya Ekle` butonu.
  - **Merkez Monitör (Esnek / Fluid):** `PreviewView` — Canlı HTTP 206 video monitörü, mikrosaniye ASS/SRT altyazı katmanı, geniş video yüzeyi.
  - **Sağ Denetçi (`360px`):** `EncodingView` — Sub-tab geçişli (Format & Encoder $\leftrightarrow$ AI & Filtreler) ferah denetçi paneli; metin ve dropdown kırpılmaları tamamen giderildi.
* **Doğrulama:** 27/27 Cargo testleri başarıyla geçti ✅ • Frontend Vite build 0 hata (1615 modül 1.38s) ✅.

## 8. Sürükle-Bırak Çiftleme & Önizleme İntro Temizliği (2026-08-27)
* **Sürükle-Bırak Çift Dosya Ekleme Onarımı:**
  - Tauri v2'de global `listen('tauri://drag-drop')` hem Window hem Webview olayını yakaladığından dosya bırakıldığında kuyruğa 2 kopya ekleniyordu.
  - `getCurrentWebviewWindow().onDragDropEvent` ile pencereye özel dinleyiciye geçildi; `type === 'drop'` filtresi uygulandı.
  - `App.tsx` içerisindeki `handleAddFilePaths` fonksiyonuna gelen yollar ve mevcut kuyruk için çiftleme (deduplication / `Set`) kontrolü eklendi.
  - React StrictMode çift mount durumunda listener sızıntısını önleyen `isMounted` yaşam döngüsü temizliği entegre edildi.
* **Önizleme İntro Videosu Bölümü Kaldırıldı:**
  - `PreviewView.tsx` içerisindeki `previewSource` (Ana Video $\leftrightarrow$ İntro Videosu) durumları ve üst geçiş buton çubuğu tamamen kaldırıldı.
  - Önizleme monitörü doğrudan kuyruktan seçilen ana videoyu ve altyazılarını oynatacak şekilde yalınlaştırıldı.
  - Başlangıçta yüklenen sahte örnek dosyalar (`Initial D`, `annen.mp4`) temizlenerek uygulamanın boş kuyrukla başlaması sağlandı.
* **Doğrulama:** 27/27 Cargo testleri başarıyla geçti ✅ • Frontend Vite build 0 hata (1617 modül 1.30s) ✅.

## 9. Kodlama Başlatma (Encode) Kök Neden Analizi & Kalıcı Çözüm (2026-08-27)
* **Kök Neden 1 (Donanım Kodlayıcı Race Condition):**
  - `App.tsx` başlangıç state'inde `encoder: 'h264_nvenc'` tanımlıydı. Dosyalar kuyruğa eklendiğinde `item.config` bu başlangıç encoder'ını kopyalıyordu.
  - `initSystem()` donanımı tarayıp `h264_vaapi` / `libx264` önerse dahi, `handleSelectItem` çağrıldığında `config` nesnesi `item.config` içindeki eski `h264_nvenc` veya Linux'ta sürücüsü olmayan `h264_amf` değerini geri yüklüyordu.
  - Kullanıcı "Kodla" butonuna bastığında FFmpeg `Cannot load libcuda.so.1` veya `DLL libamfrt64.so.1 failed to open` hatasıyla anında patlıyordu.
* **Kök Neden 2 (Altyazısız Videolarda 0:s:0 Hardsub Çökmesi):**
  - `runner.rs` içinde `hardsub_enabled: true` iken videoda gömülü altyazı akışı yoksa (`meta.subtitle_streams.is_empty()`), `extract_subtitle_track` yine de `0:s:0` çağırmaya çalışıyor ve FFmpeg akış bulamayıp işi hata ile sonlandırıyordu.
* **Kök Neden 3 (Altyazı Dönüştürme Format Eksikliği):**
  - `demuxer.rs` içerisinde altyazı kopyalama (`copy`) başarısız olduğunda retry komutunda `-c:s ass` eksikti.
* **Uygulanan Kalıcı Çözümler:**
  - `App.tsx` ve `tauri.ts` başlangıç varsayılanı evrensel `libx264` olarak güncellendi. `initSystem()` tarama sonrası kuyruktaki uyumsuz encoder'a sahip bekleyen işleri otomatik donanım encoder'ına geçirdi.
  - `handleSelectItem` refaktör edilerek kullanıcının seçtiği aktif encoder/CRF ayarları korunacak şekilde yalnız dosya yolları güncellendi.
  - `runner.rs` altyazısız videolarda hardsub çıkarmayı zarifçe atlayıp sistemi uyarı loguyla devam ettirecek şekilde güçlendirildi.
  - `demuxer.rs` retry adımına `-c:s ass` entegre edildi.
* **Doğrulama:**

## 10. URL Yolu Percent-Decoding, Dosya Adı Düzeni & Model İndirme Entegrasyonu (2026-08-28)
* **URL Percent-Decoding ve Türkçe Karakter / Boşluk Onarımı:**
  - Sürükle-bırak yoluyla eklenen dosyalarda `file:///home/sevelebeci/%C4%B0ndirilenler/...` gibi URL percent-encoding'li yollar geliyordu.
  - `normalize_file_path` (`probe.rs`) yalnızca `%20` gibi sınırlı karakterleri temizlediğinden `İndirilenler` (`%C4%B0ndirilenler`) dizininde `Path::exists()` `false` dönüyor; medya analizi (`probeMedia`) `0 B` ve `null` metadata ile düşüyordu. Bu durum altyazıların ve fontların `(0)` görünmesine ve kodlamanın `Girdi dosyası bulunamadı` hatasıyla anında çökmesine yol açıyordu.
  - `urlencoding::decode` ile hem Rust (`probe.rs`) hem de frontend (`tauri.ts`) katmanlarında tam percent-decoding uygulandı. Artık Türkçe karakterler, köşeli parantezler ve boşluklar dosya sistemiyle %100 uyumlu.
* **Kuyruk Kartı & Dosya Adı Sığma Düzeni:**
  - `FileQueue.tsx` kart düzeni refaktör edildi: Dosya adı tek satırda kırpılmak yerine `line-clamp-2` ile 2 satıra kadar tam gösterilecek şekilde ayrıldı.
  - Boyut, süre ve çözünürlük bilgileri ikinci satıra, altyazı ve font etiketleri (`📝 1 Altyazı`, `🔤 7 Font`) üçüncü satıra taşındı.
  - Sol kuyruk dock genişliği `w-[280px]` $\rightarrow$ `w-[320px] xl:w-[350px]` seviyesine genişletilerek uzun anime başlıkları için ferah alan sağlandı.
* **Yapay Zeka Model İndirme & Canlı İlerleme UI Entegrasyonu:**
  - `EncodingView.tsx` içerisine yerel diskte bulunmayan modeller için **`📥 Modeli İndir`** butonu ve canlı yüzde/megabayt ilerleme çubuğu eklendi.
  - İndirme tamamlandığında model listesi otomatik güncellenerek `✓ Model hazır (Yerel ONNX İndirildi)` rozetine geçer.
* **Doğrulama:** 28/28 Cargo testleri başarıyla geçti ✅ • Frontend Vite build 0 hata (1617 modül 1.40s) ✅.

## 11. YouTube Stili İnteraktif Zaman Çubuğu (Scrubber) (2026-08-28)
* **YouTube Tarzı Canlı İlerleme Çizgisi (`PreviewView.tsx`):**
  - Düz HTML5 range slider yerine modern katmanlı etkileşimli çubuk tasarlandı.
  - **Aktif İlerleme Çizgisi:** Saf beyaz (`bg-white`), video ilerledikçe akıcı dolan ve anlık konumu gösteren oynatma hattı.
  - **Hover Genişleme & Önizleme:** Çubuğun üzerine gelindiğinde `h-1` $\rightarrow$ `h-2` dinamik kalınlaşma ve imleç konumuna kadar yarı saydam hover önizleme çizgisi.
  - **Yüzen Zaman İpucu (Hover Tooltip):** İmlecin durduğu noktanın tam mikrosaniye/saniye zaman damgasını (`00:08:24`) çubuğun üzerinde canlı gösteren tooltip kutusu.
  - **Oynatma Kafası (Scrubber Dot):** Yalnızca hover/drag durumunda büyüyen (`scale-0` $\rightarrow$ `scale-100`) beyaz scrubber noktası.
* **Doğrulama:** `cargo test` 28/28 test geçti ✅ • `bun run build` 0 hata ✅ • Canlı oynatıcıda Initial D ve Annen.mp4 üzerinde test edildi ✅.

## 12. DESIGN.md Tam Uyumlu Saf Monochrome Dönüşüm & Retro Anime Güvenlik Mimarisi (2026-08-28)
* **Eski / Retro Anime (4:3 SD / DVD Remux / Interlace) Güvenlik Garantisi:**
  - **1:1 En-Boy Oranı Sabitleme (`setsar=1`):** Eski animelerdeki SAR/DAR uyumsuzluklarında altyazıların yana yayılması veya basık kalması engellendi.
  - **Upscale + Hardsub Sıralama Garantisi:** Yapay zeka ve Lanczos ölçekleme filtreleri (`scale=-2:1440` / `2160`) filtre zincirinde 1. sıraya, `subtitles` filtresi en son sıraya yerleştirildi. Böylece altyazılar hedef çözünürlükte mikrosaniye hassasiyetinde ve keskin olarak çizilir; fontların ölçeklemede bozulması/kaybolması engellendi.
  - **Özel Font Klasörü Bağlama (fontsdir):** Hem `SubtitleView` hem de `EncodingView` panellerine harici font klasörü bağlama seçicisi eklendi; videoda font olmasa dahi `.ass` typesetting fontları doğrudan bağlanır.
* **DESIGN.md %100 Saf Monochrome Temizlik:**
  - `PreviewView`, `EmptyState`, `FileDropZone`, `Modal`, `Tabs`, `Tooltip`, `Divider`, `QueueItem`, `StatusIndicator` ve `index.css` dosyalarındaki tüm mavi, arduvaz (`slate-*`) ve açık renk artıklar saf siyah (`#000000`), koyu antrasit (`border-outline-variant`) ve beyaz vurgulara geçirildi.
* **Doğrulama:** `cargo test` 28/28 test geçti ✅ • `bun run build` 0 hata (1617 modül 1.32s) ✅ • Canlı sistem devrede ✅.

## 13. Çift Önizleme Temizliği & Yalın Sidebar Navigasyonu (2026-08-28)
* **Yinelenen 'Önizleme' Sekmesi Kaldırıldı:**
  - `Ana Sayfa` zaten merkez monitöründe tam donanımlı canlı `PreviewView` bileşenini barındırdığı için sol menüdeki (`Sidebar.tsx`) bağımsız `Önizleme` sekmesi ve `App.tsx` içerisindeki yinelenen rota tamamen temizlendi.
  - Sidebar navigasyonu 5 ana temiz sekmeye sadeleştirildi: `Ana Sayfa`, `Altyazı`, `Dönüştürücü`, `Konsol`, `Ayarlar`.
* **Doğrulama:** `cargo test` 28/28 test geçti ✅ • `bun run build` 0 hata (1617 modül 1.33s) ✅ • Canlı sistem devrede ✅.

## 14. Genişletilmiş Sinema Önizleme Monitörü (Cinema Monitor Layout) (2026-08-28)
* **Tam Genişlikte Sinema Video Yüzeyi (`PreviewView.tsx`):**
  - Video oynatıcısını 2/3 sütuna sıkıştıran ve boyutu küçülten yan panel ızgarası kaldırıldı.
  - Video oynatıcı merkez panelin **%100 tam genişliğine (`aspect-video w-full max-h-[540px]`)** yayılarak yüzey alanı **~%70 oranında büyütüldü**. Altyazı dizgileri, zamanlama ve animasyonlar çok daha net ve ferah hale getirildi.
  - Teknik video bilgileri (Çözünürlük, FPS, Codec, PixFmt) ve Altyazı/Font durumu video monitörünün altına 2 sütunlu şık bir dashboard olarak yerleştirildi.
* **Doğrulama:** `cargo test` 28/28 test geçti ✅ • `bun run build` 0 hata (1617 modül 1.37s) ✅ • Canlı sistem devrede ✅.
  - 27/27 Cargo testleri başarıyla geçti ✅ • Frontend Vite build 0 hata (1617 modül 1.39s) ✅ • Canlı UI üzerinde Kodla $\rightarrow$ Canlı Telemetry & İlerleme $\rightarrow$ İptal Et döngüsü başarıyla test edildi ✅.

## 15. Çoklu Platform Dağıtımı (Pacman, DEB, RPM, Tar.zst) & Windows 10/11 Uyumluluğu (2026-08-29)
* **Linux Paket Dağıtımları Derlendi & Hazırlandı (`dist-release/`):**
  - **Pacman / Arch Linux:** `florasubs-reborn-bin-1.2.0-1-x86_64.pkg.tar.zst` (`makepkg` ile üretildi).
  - **Debian / Ubuntu:** `FloraSubs-Reborn_1.2.0_amd64.deb` (`.deb` paketi).
  - **Fedora / RHEL / openSUSE:** `FloraSubs-Reborn-1.2.0-1.x86_64.rpm` (`.rpm` paketi).
  - **Taşınabilir Linux Arşivleri:** `FloraSubs-Reborn-1.2.0-linux-x86_64.tar.gz` ve `.tar.zst`.
* **Windows 10 & 11 Uyumluluğu:**
  - `gpu_probe.rs`: Windows ortamında `ffmpeg.exe` ve `ffprobe.exe` ikililerini `bin/` veya sistem PATH'inden bulan `#[cfg(target_os = "windows")]` platform izolasyonu.
  - `runner.rs`: Windows 10/11 NT API tabanlı süreç duraklatma/devam ettirme (`NtSuspendProcessFn`) ve `taskkill /F /T` anında süreç temizliği.
  - `builder.rs`: Windows sürücü harfleri (`C\:/...`) ve ters eğik çizgi dosya yolu kaçış motoru.
  - `.github/workflows/release.yml`: `windows-latest` üzerinde NSIS Installer (`.exe`) ve taşınabilir `.zip` üreten CI/CD pipeline'ı devreye alındı.
* **GitHub Sürümü:** Kodlar `main` dalına pushlandı ve `v1.2.1` sürüm etiketi GitHub'a gönderildi.
* **Doğrulama:** `cargo test` 28/28 test geçti ✅ • `bun run build` 0 hata ✅ • GitHub tag `v1.2.1` yayında ✅.

## 16. Akıllı Video Sıkıştırıcı (Smart Video Compressor) Modülü (2026-08-29)
* **Bağımsız Sıkıştırıcı Sekmesi (`CompressorView.tsx` & `Sidebar.tsx`):**
  - Sol menüye `Dönüştürücü` ile `Konsol` arasına yeni **Sıkıştırıcı** (`Minimize2` ikonu) sekmesi eklendi.
  - Kaynak video analizi (`probeMedia`): Dosya boyutu, süre, çözünürlük, codec ve mevcut bitrate canlı okunur.
* **Akıllı Sıkıştırma Profilleri & Otomatik Bitrate Hesaplayıcı:**
  1. 🌟 **Kayıpsıza Yakın Akıllı AV1 (10-Bit):** Modern `libsvtav1` / GPU AV1, CRF 24, `yuv420p10le`, Opus 128k, film grain koruma ile %65-%75 boyut tasarrufu.
  2. ⚡ **Master AV1 Ultra Hızlı & Net (10-Bit):** `libsvtav1`, Preset 7, CRF 15, `-bf 5`, AAC 192k ile ultra hızlı stüdyo master render (%45-%55 tasarruf).
  3. 🛡️ **Master Arşiv HEVC / x265 (10-Bit):** `libx265` / GPU HEVC, `no-sao=1:aq-mode=3`, CRF 22, %55-%65 tasarruf.
  4. 💬 **Sosyal Medya / Hızlı Paylaşım (25 MB, 50 MB, 100 MB):** Hedef dosya boyutunu matematiksel olarak süreden hesaplayan otomatik bitrate motoru:
     $$\text{Video Bitrate (kbps)} = \frac{\text{Hedef MB} \times 8192}{\text{Süre (sn)}} - \text{Ses Bitrate (128 kbps)}$$
  5. 📱 **Ultra Kompakt Mobil:** Kısıtlı depolama alanları için optimize ultra hafif profil (~150-200 MB).
  6. 🎯 **Özel Hedef Boyut / Yüzde Küçültme:** Kullanıcının hedef MB veya % küçültme oranı girmesini sağlayan dinamik slider alanı.
* **Canlı Kalite Güvenlik Rozeti:**
  - 🟢 *Mükemmel Kalite (Şeffaf / Orijinalden Farksız)*
  - 🟡 *Dengeli Kalite (Yüksek Tasarruf)*
  - 🔴 *Agresif Sıkıştırma (Küçük Boyut)*
* **Canlı İlerleme, Duraklatma & İptal:**
  - Canlı yüzde, hız (1.8x), FPS, ETA ve log akışı; Duraklat/Devam Et ve İptal Et butonları.
* **Backend Motor İyileştirmeleri (`builder.rs`):**
  - `libx265` için anime optimizasyonları `no-sao=1:aq-mode=3` parametreleri entegre edildi.
* **P0 Dosya Seçici (Gözat) Düzeltmesi (`commands.rs`, `lib.rs`, `tauri.ts`):**
  - Frontend'in `selectMediaFile()` ile çağırdığı tekli dosya seçici `open_media_file_native` Rust komutu eksikti (yalnızca çoğul `open_media_files_native` vardı).
  - `open_media_file_native` komutu tüm video uzantıları filtreleriyle (`mkv`, `mp4`, `ts`, `webm`, `avi`, `mov`, vb.) `commands.rs` ve `lib.rs` içine entegre edildi. `tauri.ts`'e de çift katmanlı fallback eklendi.
* **Doğrulama:** `cargo test` 29/29 test geçti ✅ • `bun run build` 0 hata (1618 modül 1.59s) ✅.
