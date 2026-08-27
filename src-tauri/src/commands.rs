use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};
use tauri_plugin_dialog::DialogExt;

use crate::engine::gpu_probe::{detect_hardware, HardwareProfile};
use crate::engine::probe::{probe_media_file, MediaMetadata};
use crate::engine::demuxer::{
    extract_all_subtitles, extract_and_parse_subtitles, extract_embedded_fonts,
    extract_subtitle_track, ExtractedFontsResult, ExtractedTrackResult, SubtitleDialogue,
};
use crate::engine::builder::{
    build_ffmpeg_args, get_preset_profiles, EncodeJobConfig, PresetProfile,
};
use crate::engine::models::{download_model_file, get_ai_models_catalog, AiModelInfo};
use crate::engine::runner::{start_encoding_job, ProcessManager};
use crate::engine::streamer::MediaStreamerServer;

#[tauri::command]
pub fn get_hardware_profile() -> Result<HardwareProfile, String> {
    Ok(detect_hardware())
}

#[tauri::command]
pub async fn probe_media(file_path: String) -> Result<MediaMetadata, String> {
    tokio::task::spawn_blocking(move || probe_media_file(&file_path))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn extract_subtitle(
    input_path: String,
    subtitle_index: usize,
    output_path: String,
) -> Result<String, String> {
    tokio::task::spawn_blocking(move || {
        extract_subtitle_track(&input_path, subtitle_index, &output_path)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn extract_all_subs(
    input_path: String,
    output_dir: String,
) -> Result<Vec<ExtractedTrackResult>, String> {
    tokio::task::spawn_blocking(move || {
        extract_all_subtitles(&input_path, &output_dir)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn extract_fonts(
    input_path: String,
    target_dir: String,
) -> Result<ExtractedFontsResult, String> {
    tokio::task::spawn_blocking(move || {
        extract_embedded_fonts(&input_path, &target_dir)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub fn get_presets() -> Result<Vec<PresetProfile>, String> {
    Ok(get_preset_profiles())
}

#[tauri::command]
pub fn preview_ffmpeg_command(config: EncodeJobConfig) -> Result<Vec<String>, String> {
    build_ffmpeg_args(&config)
}

#[tauri::command]
pub fn get_models_list() -> Result<Vec<AiModelInfo>, String> {
    Ok(get_ai_models_catalog())
}

#[tauri::command]
pub async fn download_model(app: AppHandle, model_id: String) -> Result<String, String> {
    download_model_file(app, model_id).await
}

#[tauri::command]
pub async fn open_media_files_native(app: AppHandle) -> Result<Vec<String>, String> {
    let (tx, rx) = tokio::sync::oneshot::channel();
    app.dialog()
        .file()
        .add_filter("Video Dosyaları (.mkv, .mp4, .ts, .webm, .avi)", &["mkv", "mp4", "ts", "webm", "avi", "mov", "flv", "m4v"])
        .pick_files(move |files| {
            let _ = tx.send(files);
        });

    let files = rx.await.map_err(|e| e.to_string())?;
    let mut result = Vec::new();
    if let Some(list) = files {
        for file_path in list {
            let s = file_path.to_string();
            let normalized = crate::engine::probe::normalize_file_path(&s);
            result.push(normalized);
        }
    }
    Ok(result)
}
#[tauri::command]
pub fn add_media_files_direct(app: AppHandle, paths: Vec<String>) -> Result<(), String> {
    #[derive(serde::Serialize, Clone)]
    struct DragDropPayload {
        paths: Vec<String>,
    }
    let normalized_paths: Vec<String> = paths
        .into_iter()
        .map(|p| crate::engine::probe::normalize_file_path(&p))
        .collect();
    app.emit("tauri://drag-drop", DragDropPayload { paths: normalized_paths })
        .map_err(|e| e.to_string())?;
    Ok(())
}


#[tauri::command]
pub async fn open_subtitle_file_native(app: AppHandle) -> Result<Option<String>, String> {
    let (tx, rx) = tokio::sync::oneshot::channel();
    app.dialog()
        .file()
        .add_filter("Altyazı Dosyaları (.ass, .ssa, .srt, .vtt)", &["ass", "ssa", "srt", "vtt"])
        .pick_file(move |file| {
            let _ = tx.send(file);
        });

    let file = rx.await.map_err(|e| e.to_string())?;
    Ok(file.map(|p| crate::engine::probe::normalize_file_path(&p.to_string())))
}

#[tauri::command]
pub async fn open_directory_native(app: AppHandle) -> Result<Option<String>, String> {
    let (tx, rx) = tokio::sync::oneshot::channel();
    app.dialog()
        .file()
        .pick_folder(move |folder| {
            let _ = tx.send(folder);
        });

    let dir = rx.await.map_err(|e| e.to_string())?;
    Ok(dir.map(|p| crate::engine::probe::normalize_file_path(&p.to_string())))
}

#[tauri::command]
pub async fn save_subtitle_native(app: AppHandle, default_name: String) -> Result<Option<String>, String> {
    let (tx, rx) = tokio::sync::oneshot::channel();
    app.dialog()
        .file()
        .set_file_name(&default_name)
        .add_filter("ASS Altyazı", &["ass"])
        .save_file(move |file| {
            let _ = tx.send(file);
        });

    let file = rx.await.map_err(|e| e.to_string())?;
    Ok(file.map(|p| crate::engine::probe::normalize_file_path(&p.to_string())))
}

#[tauri::command]
pub fn open_in_system_player(file_path: String) -> Result<(), String> {
    let clean = crate::engine::probe::normalize_file_path(&file_path);
    open::that_detached(&clean).map_err(|e| format!("Oynatıcı başlatılamadı: {}", e))
}


#[tauri::command]
pub fn get_video_stream_url(
    state: State<'_, Arc<MediaStreamerServer>>,
    file_path: String,
) -> Result<String, String> {
    Ok(state.get_stream_url(&file_path))
}

#[tauri::command]
pub fn get_subtitle_stream_url(
    state: State<'_, Arc<MediaStreamerServer>>,
    file_path: String,
    subtitle_index: usize,
) -> Result<String, String> {
    Ok(state.get_subtitle_url(&file_path, subtitle_index))
}

#[tauri::command]
pub async fn get_preview_subtitles(
    file_path: String,
    subtitle_index: usize,
    is_external: bool,
) -> Result<Vec<SubtitleDialogue>, String> {
    tokio::task::spawn_blocking(move || {
        extract_and_parse_subtitles(&file_path, subtitle_index, is_external)
    })
    .await
    .map_err(|e| e.to_string())?
}
#[tauri::command]
pub async fn start_encode(
    app: AppHandle,
    state: State<'_, Arc<ProcessManager>>,
    config: EncodeJobConfig,
) -> Result<(), String> {
    let pm = state.inner().clone();
    tokio::spawn(async move {
        let _ = start_encoding_job(app, pm, config).await;
    });
    Ok(())
}

#[tauri::command]
pub async fn pause_encode(
    state: State<'_, Arc<ProcessManager>>,
    job_id: String,
) -> Result<(), String> {
    state.pause_job(&job_id).await
}

#[tauri::command]
pub async fn resume_encode(
    state: State<'_, Arc<ProcessManager>>,
    job_id: String,
) -> Result<(), String> {
    state.resume_job(&job_id).await
}

#[tauri::command]
pub async fn cancel_encode(
    state: State<'_, Arc<ProcessManager>>,
    job_id: String,
) -> Result<(), String> {
    state.cancel_job(&job_id).await
}

#[tauri::command]
pub async fn get_active_jobs(
    state: State<'_, Arc<ProcessManager>>,
) -> Result<Vec<(String, String)>, String> {
    let jobs = state.get_active_jobs().await;
    Ok(jobs.into_iter().map(|(id, job)| (id, format!("{:?}", job))).collect())
}

#[tauri::command]
pub async fn has_active_jobs(
    state: State<'_, Arc<ProcessManager>>,
) -> Result<bool, String> {
    Ok(state.has_active_jobs().await)
}

#[tauri::command]
pub async fn cancel_all_jobs(state: State<'_, Arc<ProcessManager>>) -> Result<(), String> {
    state.kill_all_jobs().await
}
