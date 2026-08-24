# FloraSubs Reborn — Project State & Architectural Blueprint

**Son Güncelleme:** 2026-08-25  
**Mimar:** Jony (Baş Yazılım Mimarı)  
**Kullanıcı:** Berk  
**Durum:** v1.0.0 Kararlı Sürüm Yayınlandı (Windows Port, MPV Kaldırma, Çoklu Platform GitHub Release & CI/CD)

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
* **Rust Backend:** 16/16 birim testi eksiksiz geçti (`cargo test` $\rightarrow$ 0 hata) ✅
* **Frontend Prodüksiyon Paketi:** `bun run build` $\rightarrow$ 0 Hata (1615 modül) ✅
* **GitHub Release v1.0.0:** `FloraSubs-v1.0.0-linux-x86_64.tar.gz` ve Windows NSIS `setup.exe` paketi hazırlandı ✅
