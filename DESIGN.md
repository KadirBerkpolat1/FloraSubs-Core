# FloraSubs Reborn — Design System Specification

**Sürüm:** v2.0-Industrial  
**Mimar:** Jony (Baş Yazılım Mimarı)  
**Kullanıcı & Tasarım Direktörü:** Berk  
**Görsel Konsept:** Endüstriyel Kurgu Stüdyosu (Industrial Video Workstation)

---

## 1. Marka Kimliği & Görsel Felsefe

**FloraSubs**, anime çeviri, fansub ve profesyonel video kodlama ekipleri için tasarlanmış yüksek hassasiyetli bir masaüstü çalışma istasyonudur. 

Görsel dil, DaVinci Resolve ve profesyonel video kurgu konsollarının endüstriyel sağlamlığı ile modern cam katmanlı (Glassmorphism) arayüz zarafetini birleştirir:
* **Zemin:** Göz yorgunluğunu sıfırlayan derin jet siyah ve obsidyen kömür tonları (`#070A0F`, `#0E131F`).
* **Vurgu:** Sıcak kehribar (Amber) ve elektrik turuncu (`#F59E0B`, `#FB923C`), uygulamanın güçlü kodlama motorunu ve teknik hassasiyetini simgeler.
* **Hissiyat:** Ağırbaşlı, hatasız, stüdyo kalitesinde ve akıcı mikro-etkileşimlerle donatılmış bir komuta merkezi.

---

## 2. Renk Paleti & Token Tablosu

### A. Çekirdek Marka & Aksan Renkleri (Amber & Orange)
* **`primary` (Warm Amber):** `#F59E0B` — Birincil eylemler, aktif sekmeler, ana kodlama butonu.
* **`primary-hover`:** `#D97706` — Buton üzerine gelme (hover) durumu.
* **`primary-glow`:** `rgba(245, 158, 11, 0.25)` — Odaklanma halkaları ve aktif kart çevre ışıması.
* **`accent-orange` (Electric Orange):** `#FB923C` — Canlı işleme göstergeleri, CPU/GPU yük barları.
* **`accent-cyan` (Studio Cyan):** `#06B6D4` — Altyazı kanalları, ASS/SRT parçaları ve yazı tipi çıkarıcı.

### B. Zemin & Yüzey Skalası (Jet Black / Obsidian Dark)
* **`surface-canvas` (Derin Zemin):** `#070A0F` — Uygulamanın ana arka planı.
* **`surface-panel` (Çalışma Panelleri):** `#0E131F` — 3 bölmeli stüdyo panelleri ve modül pencereleri.
* **`surface-card` (Kartlar & Kutular):** `#141B2D` — Dosya kuyruk kartları, önizleme çerçeveleri.
* **`surface-input` (Girdi Alanları):** `#1A233A` — Parametre kutuları, dropdown'lar, arama çubukları.
* **`surface-overlay` (Cam Katman):** `rgba(20, 27, 45, 0.75)` — `backdrop-filter: blur(16px)` ile modal ve HUD katmanları.

### C. Kenarlık (Border) Skalası
* **`border-subtle`:** `rgba(255, 255, 255, 0.06)` — Panel ayırıcılar ve hafif bölücüler.
* **`border-default`:** `#25314C` — Kart sınırları ve form girdileri.
* **`border-active`:** `#F59E0B` — Seçili dosya, aktif video oynatıcı kenarlığı.

### D. Tipografi & Metin Renkleri
* **`text-primary`:** `#F8FAFC` (Slate-50) — Başlıklar, kritik zaman kodları, aktif değerler.
* **`text-secondary`:** `#CBD5E1` (Slate-300) — Açıklamalar, etiketler, dosya yolları.
* **`text-muted`:** `#64748B` (Slate-500) — Pasif bilgiler, yardımcı ipuçları.
* **`text-amber`:** `#FBBF24` — Canlı FPS, render yüzdesi, vurgulu sayaçlar.

### E. Semantik Durum Renkleri
* **Başarılı (Success):** `#10B981` (Emerald) — Tamamlanan kodlamalar, doğrulanan altyazılar.
* **Uyarı (Warning):** `#F59E0B` (Amber) — Eksik font uyarısı, yüksek bitrate uyarısı.
* **Hata (Error):** `#F43F5E` (Rose) — Başarısız işler, donanım encoder hatası.
* **İşlemde (Processing):** `#06B6D4` (Cyan) / `#F59E0B` (Amber) — Çoklu thread kodlama kuyruğu.

---

## 3. Tipografi Hiyerarşisi

| Token | Yazı Tipi Ailesi | Boyut | Ağırlık | Satır Yüksekliği | Kullanım Alanı |
|---|---|---|---|---|---|
| **`display-lg`** | Space Grotesk | 24px (1.5rem) | 700 | 1.2 | Ana Stüdyo Başlığı |
| **`headline-md`** | Space Grotesk | 18px (1.125rem) | 600 | 1.3 | Panel & Modül Başlıkları |
| **`body-base`** | Inter | 14px (0.875rem) | 400 | 1.5 | Genel Metinler, Açıklamalar |
| **`label-caps`** | JetBrains Mono | 11px (0.6875rem) | 700 | 1.4 | Küçük Ayar Başlıkları (UPPERCASE) |
| **`timecode`** | JetBrains Mono | 13px (0.8125rem) | 600 | 1.2 | Oynatıcı Zaman Kodları (`00:14:22.450`) |
| **`log-mono`** | JetBrains Mono | 12px (0.75rem) | 400 | 1.4 | FFmpeg Konsol & Hata Logları |

---

## 4. Çalışma Alanı Düzeni: 3 Bölmeli Entegre Stüdyo (Multi-Pane)

Ekran, profesyonel kurgu programlarındaki gibi yatayda 3 ana fonksiyonel bölmeye ayrılır:

```
+---------------------------------------------------------------------------------------------------------+
|                                    FLORASUBS REBORN — STUDIO TOOLBAR                                    |
+--------------------------+--------------------------------------------------+---------------------------+
| 📂 INGESTION & QUEUE     | 📺 LIVE VIDEO & SUBTITLE MONITOR                | 🎛️ ENCODING INSPECTOR    |
| (Sol Panel — 300px)      | (Merkez Panel — Esnek / Fluid)                   | (Sağ Panel — 360px)       |
|                          |                                                  |                           |
| • Dosya Sürükle-Bırak    | • Canlı HTTP 206 MP4/MKV Oynatıcı                | • Encoder Seçimi (AMF/    |
| • Toplu İçe Aktarma      | • Mikrosaniye ASS Altyazı Katmanı                |   NVENC/QSV/CPU)          |
| • Kuyruk Durumu (ETA,    | • Dalga Boyu & Kare Kare İlerleme                | • 2K/4K Lanczos Ölçekleme |
|   FPS, Boyut)            | • HUD Kontrol Çubuğu (Space, F, M Kısayolları)   | • CRF & Bitrate Slider    |
| • Batch Önceliklendirme  | • Hızlı Altyazı Eşzamanlama (Offset ±ms)         | • Ses & Altyazı Demuxer   |
|                          +--------------------------------------------------+ • Canlı Konsol Logları    |
|                          | 📝 QUICK SUBTITLE / AUDIO STRIP                  |                           |
+--------------------------+--------------------------------------------------+---------------------------+
| ⚡ DURUM ÇUBUĞU: GPU: AMD RX 7600 (AMF Hazır) | Bellek: 24MB | İş Kuyruğu: 3 Video Bekliyor | v1.2.0    |
+---------------------------------------------------------------------------------------------------------+
```

---

## 5. Bileşen Standartları & Mikro-Etkileşimler

### A. Butonlar (Buttons)
* **Primary (Amber Solid):** `#F59E0B` zemin, `#070A0F` siyah metin. Hover'da `translateY(-1px)` ve hafif kehribar ışıması.
* **Secondary (Ghost / Slate Outline):** `1px solid #25314C`, `#CBD5E1` metin. Hover'da `#1A233A` arka plan.
* **Danger (Rose Solid/Outline):** Yalnızca iptal etme veya kuyruktan silme eylemlerinde.

### B. Çözünürlük & Encoder Hapları (Pills)
* **Seçili Durum:** Kehribar kenarlık (`#F59E0B`), hafif kehribar zemin tonu (`rgba(245, 158, 11, 0.12)`).
* **Pasif Durum:** `#141B2D` zemin, `#64748B` metin.

### C. Canlı İlerleme Çubukları (Progress Bars)
* **Zemin:** `#0E131F`.
* **Dolgu:** Çift renkli gradient (`#F59E0B` $\rightarrow$ `#FB923C`). Kodlama esnasında akıcı çizgi animasyonu (animated stripe).
* **Yükseklik:** Kuyruk kartlarında 4px, ana render panelinde 8px.

### D. Canlı Video HUD & Oynatıcı
* Video üzerine gelindiğinde (mouse hover) alt kontrol çubuğu `opacity: 0`'dan `1`'e yumuşak geçişle (`transition: opacity 150ms ease`) belirir.
* Klavye kısayolları (Space, F, Sol/Sağ ok) tetiklendiğinde ekranın ortasında 300ms süren yarı saydam kehribar rozet animasyonu belirip kaybolur.

---

## 6. Animasyon & Geçiş Standartları (Motion Tokens)

* **Mikro-Etkileşim Süresi:** `150ms` — Buton tıklamaları, tab geçişleri, hover tepkileri.
* **Panel Açılma / Kapanma:** `250ms cubic-bezier(0.16, 1, 0.3, 1)` (Akıcı yay / Spring animasyonu).
* **Cam Bulanıklığı (Glass Blur):** `backdrop-filter: blur(12px)` ile kart arkası derinlik hissi.
* **Performans Prensibi:** Tüm animasyonlar yalnızca `transform` ve `opacity` CSS özellikleri üzerinden GPU hızlandırmalı yürütülür; video akışı veya ffmpeg render'ı esnasında sıfır CPU darboğazı oluşturur.
