# FloraSubs Reborn — Design System Specification

**Sürüm:** v2.0-Monochrome  
**Mimar:** Jony (Baş Yazılım Mimarı)  
**Kullanıcı & Tasarım Direktörü:** Berk  
**Görsel Konsept:** Siyah-Beyaz Minimalist Stüdyo (Monochrome Pro Workstation)

---

## 1. Marka Kimliği & Görsel Felsefe

**FloraSubs**, fansub ve anime video işleme için geliştirilmiş yüksek kontrastlı, minimalist ve saf siyah-beyaz bir profesyonel stüdyodur.

* **Felsefe:** Dikkat dağıtıcı sarı/turuncu neon renkler yerine, Apple Pro ve Linear benzeri saf siyah (`#000000`), mat kömür (`#121212`, `#181818`) ve yüksek kontrastlı saf beyaz (`#FFFFFF`) tipografi.
* **Hissiyat:** Ağırbaşlı, pürüzsüz, göz yormayan ve fonksiyonel.
* **Sadeleşme:** Sol alttaki gereksiz telemetri kutusu kaldırılmış; çalışma alanı maksimum ferahlığa kavuşturulmuştur.

---

## 2. Renk Paleti & Token Tablosu

### A. Zemin & Yüzey Skalası (Monochrome Dark)
* **`surface-canvas` (Derin Zemin):** `#000000` (Pure Pitch Black).
* **`surface-panel` (Çalışma Panelleri):** `#0A0A0A` / `#121212` — 3 bölmeli stüdyo dock'ları.
* **`surface-card` (Kartlar & Kutular):** `#181818` / `#222222` — Kuyruk kartları ve form grupları.
* **`surface-input` (Girdi Alanları):** `#141414` — Mat koyu girdi kutuları ve açılır menüler.
* **`border-subtle`:** `rgba(255, 255, 255, 0.08)` / `#262626` — İnce 1px bölücüler.

### B. Vurgu & Buton Renkleri
* **`primary` (Pure White):** `#FFFFFF` — Birincil butonlar (`bg-white text-black font-bold`).
* **`primary-hover`:** `#E5E5E5` — Hover zemin rengi.
* **`text-primary`:** `#FFFFFF` — Başlıklar ve seçili durumlar.
* **`text-secondary`:** `#A3A3A3` — Açıklamalar, pasif etiketler.
* **`text-muted`:** `#737373` — Pasif zaman kodları ve yardımcı metinler.

### C. Fonksiyonel Durum Renkleri (Sadeleştirilmiş)
* **Başarılı (Success):** `#10B981` (Minimalist Zümrüt) — Yalnızca tamamlanan kodlamalar ve canlı durum noktası.
* **Hata (Error):** `#EF4444` (Kırmızı) — Yalnızca hata uyarıları.

---

## 3. Çalışma Alanı Düzeni: 3 Bölmeli Ferah Stüdyo

```
+---------------------------------------------------------------------------------------------------------+
|                                    FLORASUBS — FANSUB & ANIME ENCODING                                  |
+--------------------------+--------------------------------------------------+---------------------------+
| 📂 DOSYA KUYRUĞU         | 📺 CANLI VİDEO & ALTYAZI MONİTÖRÜ                | 🎛️ KODLAMA DENETÇİSİ      |
| (Sol Dock — 280px)       | (Merkez Monitör — Esnek / Fluid)                 | (Sağ Panel — 360px)       |
|                          |                                                  |                           |
| • Dosya Sürükle-Bırak    | • Canlı HTTP 206 Video Oynatıcı                  | [ Format & Encoder ]      |
| • Kuyruk Parça Listesi   | • Mikrosaniye ASS Altyazı HUD                    | • Çıkış Türü / Bitrate    |
| • 1-Tıkla İçe Aktarma    | • Klavye Kısayolları (Space, F, M)               | • GPU Donanım Encoder     |
| • Temiz Kuyruk Kartları  | • Geniş & Odaklanmış Video Yüzeyi                | • Kalite (CRF/CQ) Slider  |
|                          |                                                  | • Çıktı Dizini Seçimi     |
|                          |                                                  | ------------------------- |
|                          |                                                  | [ Kodla ] [ Toplu Kodla ] |
+--------------------------+--------------------------------------------------+---------------------------+
```
