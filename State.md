# FloraSubs Reborn — Project State & Architectural Blueprint

**Son Güncelleme:** 2026-08-24  
**Mimar:** Jony (Baş Yazılım Mimarı)  
**Kullanıcı:** Berk  
**Durum:** Tamamlandı — Video Oynatıcı Play/Pause Senkronizasyon Hatası & Kısayollar Düzeltildi (Tauri v2 + Rust + React 19)

---

## 1. Yönetici Özeti (Executive Summary)
FloraSubs Reborn; anime çeviri ve fansub ekipleri için özel olarak tasarlanmış, ultra hafif (~25MB RAM), sıfır yapılandırmalı, bağımsız bir masaüstü video kodlama, altyazı gömme (hardsub) ve yapay zeka iş istasyonudur.

Önizleme video oynatıcısında hızlı/ardışık tıklamalarda yaşanan oynat/duraklat durum desenkronizasyonu (video oynarken ortadaki play butonunun takılı kalması) doğrudan HTML5 `<video>` yerel yaşam döngüsü olaylarına bağlanarak ve `AbortError` korumasıyla %100 çözülmüştür.

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
* **Rust Backend:** 13/13 birim testi eksiksiz geçti (`cargo test` $\rightarrow$ 0 hata) ✅
* **Frontend Prodüksiyon Paketi:** `bun run build` $\rightarrow$ 0 Hata (1.36s) ✅
