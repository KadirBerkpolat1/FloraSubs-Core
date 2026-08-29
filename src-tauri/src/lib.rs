use std::sync::Arc;
use tauri::Manager;
use crate::engine::runner::ProcessManager;
use crate::engine::streamer::MediaStreamerServer;

pub mod engine;
pub mod commands;

pub fn run() {
    let process_manager = Arc::new(ProcessManager::new());
    let streamer = tauri::async_runtime::block_on(async {
        Arc::new(MediaStreamerServer::start().await.expect("Failed to start media streamer server"))
    });

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .manage(process_manager)
        .manage(streamer)
        .invoke_handler(tauri::generate_handler![
            commands::get_hardware_profile,
            commands::probe_media,
            commands::extract_subtitle,
            commands::extract_all_subs,
            commands::extract_fonts,
            commands::get_presets,
            commands::preview_ffmpeg_command,
            commands::get_models_list,
            commands::download_model,
            commands::open_media_files_native,
            commands::add_media_files_direct,
            commands::open_subtitle_file_native,
            commands::open_directory_native,
            commands::save_subtitle_native,
            commands::open_in_system_player,
            commands::get_video_stream_url,
            commands::get_subtitle_stream_url,
            commands::get_preview_subtitles,
            commands::start_encode,
            commands::pause_encode,
            commands::resume_encode,
            commands::cancel_all_jobs,
            commands::get_active_jobs,
            commands::has_active_jobs,
        ])
        .on_window_event(|window, event| {
            match event {
                tauri::WindowEvent::CloseRequested { .. } | tauri::WindowEvent::Destroyed => {
                    let pm = window.state::<Arc<ProcessManager>>();
                    let _ = tauri::async_runtime::block_on(pm.kill_all_jobs());
                }
                _ => {}
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}