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
        // Upscale Models
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
        .user_agent("FloraSubs/1.0 (BerkOS AI Studio)")
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
        // İşlevsiz ONNX girdileri kaldırıldı — builder yalnız GLSL shader çalıştırabilir.
        assert!(!catalog.iter().any(|m| m.format == "onnx"));
        assert!(catalog.iter().any(|m| m.id == "Anime4K_Upscale_HD"));

        // SVP and minterpolate should always report installed (built-in)
        assert!(is_model_installed("SVP"));
        assert!(is_model_installed("minterpolate"));
    }
}
