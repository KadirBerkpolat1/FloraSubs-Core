use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{AppHandle, Emitter};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiModelInfo {
    pub id: String,
    pub name: String,
    pub category: String, // "upscale" | "frame_gen"
    pub format: String,   // "onnx" | "glsl" | "ncnn"
    pub filename: String,
    pub download_url: String,
    pub size_mb: f64,
    pub is_downloaded: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelDownloadProgress {
    pub model_id: String,
    pub downloaded_bytes: u64,
    pub total_bytes: u64,
    pub percentage: f64,
    pub status: String, // "downloading" | "completed" | "error"
    pub error: Option<String>,
}

/// Resolves the local `models/` storage directory.
pub fn get_models_dir() -> PathBuf {
    // 1. Check if relative "models" directory exists in current working directory
    let cwd_models = PathBuf::from("models");
    if cwd_models.exists() {
        return cwd_models;
    }

    // 2. Check next to current executable
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            let local = exe_dir.join("models");
            if local.exists() {
                return local;
            }
        }
    }

    // 3. User data directory (e.g. ~/.local/share/FloraSubs/models)
    if let Some(proj_dir) = dirs::data_dir() {
        let p = proj_dir.join("FloraSubs").join("models");
        let _ = std::fs::create_dir_all(&p);
        p
    } else {
        let p = PathBuf::from("models");
        let _ = std::fs::create_dir_all(&p);
        p
    }
}

/// Returns the catalog of supported AI Upscaling & Frame Generation models.
pub fn get_ai_models_catalog() -> Vec<AiModelInfo> {
    let models_dir = get_models_dir();

    let mut catalog = vec![
        // --- 1. AnimeJaNai HD V3 Family (Real-ESRGAN Compact / SPAN) ---
        AiModelInfo {
            id: "2x_AnimeJaNai_HD_V3_Compact".to_string(),
            name: "AnimeJaNai HD V3 Compact (2x - Dengeli / En Çok Tercih Edilen)".to_string(),
            category: "upscale".to_string(),
            format: "onnx".to_string(),
            filename: "2x_AnimeJaNai_HD_V3_Compact.onnx".to_string(),
            download_url: "https://github.com/hooke007/dotfiles/releases/download/onnx_models/the_database_AnimeJaNaiV3L1_HD_x2_fp16_op17.onnx".to_string(),
            size_mb: 4.6,
            is_downloaded: false,
        },
        AiModelInfo {
            id: "2x_AnimeJaNai_HD_V3_UltraCompact".to_string(),
            name: "AnimeJaNai HD V3 UltraCompact (2x - Hızlı)".to_string(),
            category: "upscale".to_string(),
            format: "onnx".to_string(),
            filename: "2x_AnimeJaNai_HD_V3_UltraCompact.onnx".to_string(),
            download_url: "https://github.com/hooke007/dotfiles/releases/download/onnx_models/the_database_AnimeJaNaiV3L2_HD_x2_fp16_op17.onnx".to_string(),
            size_mb: 2.4,
            is_downloaded: false,
        },
        AiModelInfo {
            id: "2x_AnimeJaNai_HD_V3_SuperUltraCompact".to_string(),
            name: "AnimeJaNai HD V3 SuperUltraCompact (2x - Ultra Hızlı Gerçek Zamanlı)".to_string(),
            category: "upscale".to_string(),
            format: "onnx".to_string(),
            filename: "2x_AnimeJaNai_HD_V3_SuperUltraCompact.onnx".to_string(),
            download_url: "https://github.com/hooke007/dotfiles/releases/download/onnx_models/the_database_AnimeJaNaiV3L3_HD_x2_fp16_op17.onnx".to_string(),
            size_mb: 1.2,
            is_downloaded: false,
        },
        AiModelInfo {
            id: "2x_AnimeJaNai_HD_V3Sharp1_Compact".to_string(),
            name: "AnimeJaNai HD V3Sharp1 Compact (2x - Keskin Çizgili / HQ)".to_string(),
            category: "upscale".to_string(),
            format: "onnx".to_string(),
            filename: "2x_AnimeJaNai_HD_V3Sharp1_Compact.onnx".to_string(),
            download_url: "https://github.com/hooke007/dotfiles/releases/download/onnx_models/the_database_AnimeJaNaiV3L1_sharp_HD_x2_fp16_op17.onnx".to_string(),
            size_mb: 4.6,
            is_downloaded: false,
        },
        AiModelInfo {
            id: "2x_AnimeJaNai_HD_V3Sharp1_UltraCompact".to_string(),
            name: "AnimeJaNai HD V3Sharp1 UltraCompact (2x - Keskin / Hızlı)".to_string(),
            category: "upscale".to_string(),
            format: "onnx".to_string(),
            filename: "2x_AnimeJaNai_HD_V3Sharp1_UltraCompact.onnx".to_string(),
            download_url: "https://github.com/hooke007/dotfiles/releases/download/onnx_models/the_database_AnimeJaNaiV3L2_sharp_HD_x2_fp16_op17.onnx".to_string(),
            size_mb: 2.4,
            is_downloaded: false,
        },
        AiModelInfo {
            id: "2x_AnimeJaNai_HD_V3Sharp1_SuperUltraCompact".to_string(),
            name: "AnimeJaNai HD V3Sharp1 SuperUltraCompact (2x - Keskin / Ultra Hızlı)".to_string(),
            category: "upscale".to_string(),
            format: "onnx".to_string(),
            filename: "2x_AnimeJaNai_HD_V3Sharp1_SuperUltraCompact.onnx".to_string(),
            download_url: "https://github.com/hooke007/dotfiles/releases/download/onnx_models/the_database_AnimeJaNaiV3L3_sharp_HD_x2_fp16_op17.onnx".to_string(),
            size_mb: 1.2,
            is_downloaded: false,
        },
        AiModelInfo {
            id: "2x_AnimeJaNai_SD_V1beta34_Compact".to_string(),
            name: "AnimeJaNai SD V1beta34 Compact (2x - SD / Retro Anime Restorasyonu)".to_string(),
            category: "upscale".to_string(),
            format: "onnx".to_string(),
            filename: "2x_AnimeJaNai_SD_V1beta34_Compact.onnx".to_string(),
            download_url: "https://github.com/hooke007/dotfiles/releases/download/onnx_models/the_database_AnimeJaNai_L1sharp_x2_fp16_op14.onnx".to_string(),
            size_mb: 4.6,
            is_downloaded: false,
        },

        // --- 2. Adore & Fallin Family (renarchi / Real-CUGAN) ---
        AiModelInfo {
            id: "2x_Adore_renarchi_fp16_DML_onnxslim".to_string(),
            name: "Adore Renarchi FP16 DirectML Slim (2x - Real-CUGAN / En Çok Tercih Edilen)".to_string(),
            category: "upscale".to_string(),
            format: "onnx".to_string(),
            filename: "2x_Adore_renarchi_fp16_DML_onnxslim.onnx".to_string(),
            download_url: "https://github.com/renarchi/Re-SISR/releases/download/Adore/2x_Adore_renarchi_fp16_DML_onnxslim.onnx".to_string(),
            size_mb: 5.4,
            is_downloaded: false,
        },
        AiModelInfo {
            id: "2x_Adore_renarchi_fp32".to_string(),
            name: "Adore Renarchi FP32 Full Precision (2x - Real-CUGAN)".to_string(),
            category: "upscale".to_string(),
            format: "onnx".to_string(),
            filename: "2x_Adore_renarchi_fp32.onnx".to_string(),
            download_url: "https://github.com/renarchi/Re-SISR/releases/download/Adore/2x_Adore_renarchi_fp32.onnx".to_string(),
            size_mb: 10.8,
            is_downloaded: false,
        },
        AiModelInfo {
            id: "2x_fallin_soft_renarchi_fp16".to_string(),
            name: "Fallin Soft Renarchi FP16 (2x - Yumuşak / Artefakt Temizleme)".to_string(),
            category: "upscale".to_string(),
            format: "onnx".to_string(),
            filename: "2x_fallin_soft_renarchi_fp16.onnx".to_string(),
            download_url: "https://github.com/renarchi/Re-SISR/releases/download/Fallin/2x_Fallin_soft_renarchi_fp16.onnx".to_string(),
            size_mb: 5.4,
            is_downloaded: false,
        },
        AiModelInfo {
            id: "2x_fallin_strong_renarchi_fp16".to_string(),
            name: "Fallin Strong Renarchi FP16 (2x - Güçlü Keskinleştirme)".to_string(),
            category: "upscale".to_string(),
            format: "onnx".to_string(),
            filename: "2x_fallin_strong_renarchi_fp16.onnx".to_string(),
            download_url: "https://github.com/renarchi/Re-SISR/releases/download/Fallin/2x_Fallin_strong_renarchi_fp16.onnx".to_string(),
            size_mb: 5.4,
            is_downloaded: false,
        },

        // --- 3. Special Purpose & Video Upscalers ---
        AiModelInfo {
            id: "2x_AniScale_Compact".to_string(),
            name: "AniScale Compact (2x - Hızlı Anime Upscaler)".to_string(),
            category: "upscale".to_string(),
            format: "onnx".to_string(),
            filename: "2x_AniScale_Compact.onnx".to_string(),
            download_url: "https://github.com/hooke007/dotfiles/releases/download/onnx_models/Bubblemint864_AnimeScaleV1_Compact_x2_fp16_op14.onnx".to_string(),
            size_mb: 4.6,
            is_downloaded: false,
        },
        AiModelInfo {
            id: "2x_LD-Anime-Compact".to_string(),
            name: "LD-Anime Compact (2x - Çizgi Karartma ve 2x Ölçekleme)".to_string(),
            category: "upscale".to_string(),
            format: "onnx".to_string(),
            filename: "2x_LD-Anime-Compact.onnx".to_string(),
            download_url: "https://github.com/hooke007/dotfiles/releases/download/onnx_models/Zarxrax_LD_Anime_Compact_x2_fp16_op14.onnx".to_string(),
            size_mb: 4.6,
            is_downloaded: false,
        },
        AiModelInfo {
            id: "4x-RealESRGAN-AnimeVideoV3-Compact".to_string(),
            name: "Real-ESRGAN AnimeVideoV3 Compact (4x - 4K Video Upscale)".to_string(),
            category: "upscale".to_string(),
            format: "onnx".to_string(),
            filename: "4x-RealESRGAN-AnimeVideoV3-Compact.onnx".to_string(),
            download_url: "https://github.com/hooke007/dotfiles/releases/download/onnx_models/xinntao_realesrV3_animevideo_x4_fp16_op14.onnx".to_string(),
            size_mb: 4.6,
            is_downloaded: false,
        },
        AiModelInfo {
            id: "4x-RealESRGAN-v2-Compact".to_string(),
            name: "Real-ESRGAN v2 Compact (4x - Ultra HD)".to_string(),
            category: "upscale".to_string(),
            format: "onnx".to_string(),
            filename: "4x-RealESRGAN-v2-Compact.onnx".to_string(),
            download_url: "https://github.com/hooke007/dotfiles/releases/download/onnx_models/xinntao_realesrV3_general_wdn_x4_fp16_op14.onnx".to_string(),
            size_mb: 4.6,
            is_downloaded: false,
        },
        AiModelInfo {
            id: "RealESRGANv2-animevideo-xsx2".to_string(),
            name: "RealESRGANv2 AnimeVideo xsx2 (2x - Video Optimize)".to_string(),
            category: "upscale".to_string(),
            format: "onnx".to_string(),
            filename: "RealESRGANv2-animevideo-xsx2.onnx".to_string(),
            download_url: "https://github.com/hooke007/dotfiles/releases/download/onnx_models/realesrV2_animevideo_xs_x2_fp16_op14.onnx".to_string(),
            size_mb: 4.6,
            is_downloaded: false,
        },
        AiModelInfo {
            id: "sudo_shuffle_cugan_fp16_op18_clamped_9.584.969".to_string(),
            name: "Sudo Shuffle Real-CUGAN FP16 (2x - CUGAN OP18)".to_string(),
            category: "upscale".to_string(),
            format: "onnx".to_string(),
            filename: "sudo_shuffle_cugan_fp16_op18_clamped_9.584.969.onnx".to_string(),
            download_url: "https://github.com/hooke007/dotfiles/releases/download/onnx_models/styler00dollar_sudo_shuffle_cugan_x2_fp16_op18.onnx".to_string(),
            size_mb: 3.8,
            is_downloaded: false,
        },
        AiModelInfo {
            id: "Anime4K_Restore_UL".to_string(),
            name: "Anime4K Restore Ultra-Light (ONNX FP16 Restorasyon)".to_string(),
            category: "upscale".to_string(),
            format: "onnx".to_string(),
            filename: "Anime4K_Restore_UL.onnx".to_string(),
            download_url: "https://raw.githubusercontent.com/bloc97/Anime4K/master/glsl/Restore/Anime4K_Restore_CNN_UL.glsl".to_string(),
            size_mb: 0.2,
            is_downloaded: false,
        },
        AiModelInfo {
            id: "Anime4K_Upscale_HD".to_string(),
            name: "Anime4K Upscale HD (Ultra Fast Shader GLSL)".to_string(),
            category: "upscale".to_string(),
            format: "glsl".to_string(),
            filename: "Anime4K_Upscale_HD.glsl".to_string(),
            download_url: "https://raw.githubusercontent.com/bloc97/Anime4K/master/glsl/Upscale/Anime4K_Upscale_CNN_x2_M.glsl".to_string(),
            size_mb: 0.04,
            is_downloaded: false,
        },
    ];

    for model in &mut catalog {
        let path = models_dir.join(&model.filename);
        model.is_downloaded = path.exists() && std::fs::metadata(&path).map(|m| m.len() > 1000).unwrap_or(false);
    }

    catalog
}

/// Checks if a model file is present on disk by id, filename, or display name.
pub fn is_model_installed(model_id_or_name: &str) -> bool {
    let normalized = model_id_or_name.trim();
    if normalized.is_empty() || normalized == "SVP" || normalized == "minterpolate" {
        return true;
    }

    let catalog = get_ai_models_catalog();
    for m in &catalog {
        if m.id.eq_ignore_ascii_case(normalized)
            || m.filename.eq_ignore_ascii_case(normalized)
            || m.name.eq_ignore_ascii_case(normalized)
            || m.id.eq_ignore_ascii_case(&normalized.replace(' ', "_"))
            || m.id.eq_ignore_ascii_case(&normalized.replace(' ', "-"))
        {
            return m.is_downloaded;
        }
    }

    let path = get_models_dir().join(normalized);
    path.exists() && std::fs::metadata(&path).map(|m| m.len() > 1000).unwrap_or(false)
}
/// Downloads an AI model asynchronously with real-time percentage emissions to Tauri frontend.
pub async fn download_model_file(
    app: AppHandle,
    model_id: String,
) -> Result<String, String> {
    let catalog = get_ai_models_catalog();
    let query = model_id.trim();
    let model = catalog
        .into_iter()
        .find(|m| {
            m.id.eq_ignore_ascii_case(query)
                || m.filename.eq_ignore_ascii_case(query)
                || m.name.eq_ignore_ascii_case(query)
                || m.id.eq_ignore_ascii_case(&query.replace(' ', "_"))
                || m.id.eq_ignore_ascii_case(&query.replace(' ', "-"))
        })
        .ok_or_else(|| format!("Model bulunamadı: {}", model_id))?;

    let models_dir = get_models_dir();
    let _ = std::fs::create_dir_all(&models_dir);
    let target_path = models_dir.join(&model.filename);

    if target_path.exists() && std::fs::metadata(&target_path).map(|m| m.len() > 1000).unwrap_or(false) {
        let _ = app.emit(
            "model-download-progress",
            ModelDownloadProgress {
                model_id: model.id.clone(),
                downloaded_bytes: (model.size_mb * 1024.0 * 1024.0) as u64,
                total_bytes: (model.size_mb * 1024.0 * 1024.0) as u64,
                percentage: 100.0,
                status: "completed".to_string(),
                error: None,
            },
        );
        return Ok(target_path.to_string_lossy().to_string());
    }

    let temp_file_path = models_dir.join(format!("{}.tmp", model.filename));

    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .redirect(reqwest::redirect::Policy::limited(10))
        .tcp_keepalive(Some(std::time::Duration::from_secs(30)))
        .timeout(std::time::Duration::from_secs(600))
        .build()
        .map_err(|e| format!("HTTP istemcisi oluşturulamadı: {}", e))?;

    let response_result = client.get(&model.download_url).send().await;
    let response = match response_result {
        Ok(res) => {
            if !res.status().is_success() {
                let err_msg = format!("Sunucu yanıt hatası: HTTP {}", res.status());
                let _ = app.emit(
                    "model-download-progress",
                    ModelDownloadProgress {
                        model_id: model.id.clone(),
                        downloaded_bytes: 0,
                        total_bytes: 0,
                        percentage: 0.0,
                        status: "error".to_string(),
                        error: Some(err_msg.clone()),
                    },
                );
                return Err(err_msg);
            }
            res
        }
        Err(e) => {
            let err_msg = format!("İndirme başlatılamadı: {}", e);
            let _ = app.emit(
                "model-download-progress",
                ModelDownloadProgress {
                    model_id: model.id.clone(),
                    downloaded_bytes: 0,
                    total_bytes: 0,
                    percentage: 0.0,
                    status: "error".to_string(),
                    error: Some(err_msg.clone()),
                },
            );
            return Err(err_msg);
        }
    };

    let total_size = response.content_length().unwrap_or((model.size_mb * 1024.0 * 1024.0) as u64);
    let mut downloaded: u64 = 0;

    let mut stream = response.bytes_stream();
    use futures_util::StreamExt;
    use tokio::io::AsyncWriteExt;

    let mut file = match tokio::fs::File::create(&temp_file_path).await {
        Ok(f) => f,
        Err(e) => {
            let err_msg = format!("Geçici dosya oluşturulamadı: {}", e);
            let _ = app.emit(
                "model-download-progress",
                ModelDownloadProgress {
                    model_id: model.id.clone(),
                    downloaded_bytes: 0,
                    total_bytes: 0,
                    percentage: 0.0,
                    status: "error".to_string(),
                    error: Some(err_msg.clone()),
                },
            );
            return Err(err_msg);
        }
    };

    while let Some(chunk_result) = stream.next().await {
        match chunk_result {
            Ok(chunk) => {
                if let Err(e) = file.write_all(&chunk).await {
                    let _ = tokio::fs::remove_file(&temp_file_path).await;
                    let err_msg = format!("Dosyaya yazılamadı: {}", e);
                    let _ = app.emit(
                        "model-download-progress",
                        ModelDownloadProgress {
                            model_id: model.id.clone(),
                            downloaded_bytes: downloaded,
                            total_bytes: total_size,
                            percentage: 0.0,
                            status: "error".to_string(),
                            error: Some(err_msg.clone()),
                        },
                    );
                    return Err(err_msg);
                }

                downloaded += chunk.len() as u64;
                let percentage = if total_size > 0 {
                    ((downloaded as f64 / total_size as f64) * 100.0).clamp(0.0, 100.0)
                } else {
                    50.0
                };

                let _ = app.emit(
                    "model-download-progress",
                    ModelDownloadProgress {
                        model_id: model.id.clone(),
                        downloaded_bytes: downloaded,
                        total_bytes: total_size,
                        percentage: (percentage * 10.0).round() / 10.0,
                        status: "downloading".to_string(),
                        error: None,
                    },
                );
            }
            Err(e) => {
                let _ = tokio::fs::remove_file(&temp_file_path).await;
                let err_msg = format!("Veri akışı hatası: {}", e);
                let _ = app.emit(
                    "model-download-progress",
                    ModelDownloadProgress {
                        model_id: model.id.clone(),
                        downloaded_bytes: downloaded,
                        total_bytes: total_size,
                        percentage: 0.0,
                        status: "error".to_string(),
                        error: Some(err_msg.clone()),
                    },
                );
                return Err(err_msg);
            }
        }
    }

    if let Err(e) = file.flush().await {
        let _ = tokio::fs::remove_file(&temp_file_path).await;
        return Err(format!("Dosya kaydedilemedi: {}", e));
    }
    drop(file);

    // Rename temp file to final destination
    if let Err(e) = tokio::fs::rename(&temp_file_path, &target_path).await {
        let _ = tokio::fs::remove_file(&temp_file_path).await;
        let err_msg = format!("Model dosyası kaydedilemedi: {}", e);
        let _ = app.emit(
            "model-download-progress",
            ModelDownloadProgress {
                model_id: model.id.clone(),
                downloaded_bytes: downloaded,
                total_bytes: total_size,
                percentage: 0.0,
                status: "error".to_string(),
                error: Some(err_msg.clone()),
            },
        );
        return Err(err_msg);
    }

    let _ = app.emit(
        "model-download-progress",
        ModelDownloadProgress {
            model_id: model.id.clone(),
            downloaded_bytes: total_size,
            total_bytes: total_size,
            percentage: 100.0,
            status: "completed".to_string(),
            error: None,
        },
    );

    Ok(target_path.to_string_lossy().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_models_catalog_and_lookup() {
        let catalog = get_ai_models_catalog();
        assert_eq!(catalog.len(), 19, "Catalog must contain all 19 registered models");

        // ONNX Models check
        let onnx_models: Vec<_> = catalog.iter().filter(|m| m.format == "onnx").collect();
        assert_eq!(onnx_models.len(), 18, "Must contain 18 ONNX models");

        // GLSL Shader check
        let glsl_models: Vec<_> = catalog.iter().filter(|m| m.format == "glsl").collect();
        assert_eq!(glsl_models.len(), 1, "Must contain 1 GLSL shader");
        assert_eq!(glsl_models[0].id, "Anime4K_Upscale_HD");

        // Specific key models presence
        assert!(catalog.iter().any(|m| m.id == "2x_AnimeJaNai_HD_V3_Compact"));
        assert!(catalog.iter().any(|m| m.id == "2x_AnimeJaNai_HD_V3_SuperUltraCompact"));
        assert!(catalog.iter().any(|m| m.id == "2x_AnimeJaNai_HD_V3Sharp1_Compact"));
        assert!(catalog.iter().any(|m| m.id == "2x_AnimeJaNai_SD_V1beta34_Compact"));
        assert!(catalog.iter().any(|m| m.id == "2x_Adore_renarchi_fp16_DML_onnxslim"));
        assert!(catalog.iter().any(|m| m.id == "2x_fallin_soft_renarchi_fp16"));
        assert!(catalog.iter().any(|m| m.id == "2x_fallin_strong_renarchi_fp16"));
        assert!(catalog.iter().any(|m| m.id == "2x_AniScale_Compact"));
        assert!(catalog.iter().any(|m| m.id == "2x_LD-Anime-Compact"));
        assert!(catalog.iter().any(|m| m.id == "4x-RealESRGAN-AnimeVideoV3-Compact"));
        assert!(catalog.iter().any(|m| m.id == "sudo_shuffle_cugan_fp16_op18_clamped_9.584.969"));
        assert!(catalog.iter().any(|m| m.id == "Anime4K_Restore_UL"));

        // Validation of all models
        for m in &catalog {
            assert!(!m.id.trim().is_empty(), "Model ID cannot be empty");
            assert!(!m.name.trim().is_empty(), "Model Name cannot be empty");
            assert!(!m.filename.trim().is_empty(), "Model Filename cannot be empty");
            assert!(m.download_url.starts_with("https://"), "Download URL must be HTTPS");
            assert!(m.size_mb > 0.0, "Model size must be positive");
        }

        // Built-in interpolators
        assert!(is_model_installed("SVP"));
        assert!(is_model_installed("minterpolate"));
    }
}
