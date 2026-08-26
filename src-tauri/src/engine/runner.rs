use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tokio::sync::Mutex;

use crate::engine::builder::{build_ffmpeg_args, EncodeJobConfig};
use crate::engine::demuxer::{cleanup_fonts_dir, extract_subtitle_track, prepare_job_fonts_dir};
use crate::engine::gpu_probe::resolve_ffmpeg_path;
use crate::engine::probe::{format_duration, probe_media_file};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EncodeProgress {
    pub job_id: String,
    pub frame: u64,
    pub fps: f64,
    pub q: f64,
    pub size_bytes: u64,
    pub time_secs: f64,
    pub time_formatted: String,
    pub bitrate_kbps: f64,
    pub speed: f64,
    pub percentage: f64,
    pub eta_secs: f64,
    pub eta_formatted: String,
    pub status: String,
    pub error_message: Option<String>,
}

impl Default for EncodeProgress {
    fn default() -> Self {
        Self {
            job_id: String::new(),
            frame: 0,
            fps: 0.0,
            q: 0.0,
            size_bytes: 0,
            time_secs: 0.0,
            time_formatted: "00:00:00".to_string(),
            bitrate_kbps: 0.0,
            speed: 0.0,
            percentage: 0.0,
            eta_secs: 0.0,
            eta_formatted: "--:--:--".to_string(),
            status: "idle".to_string(),
            error_message: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobLogMessage {
    pub job_id: String,
    pub line: String,
    pub stream: String,
    pub timestamp: String,
}

#[derive(Debug, Clone)]
pub struct ActiveJob {
    pub pid: u32,
    pub fonts_temp_dir: Option<PathBuf>,
    pub is_paused: bool,
    pub config: EncodeJobConfig,
}

pub struct ProcessManager {
    jobs: Arc<Mutex<HashMap<String, ActiveJob>>>,
    cancelled_jobs: Arc<Mutex<std::collections::HashSet<String>>>,
}


impl ProcessManager {
    pub fn new() -> Self {
        Self {
            jobs: Arc::new(Mutex::new(HashMap::new())),
            cancelled_jobs: Arc::new(Mutex::new(std::collections::HashSet::new())),
        }
    }


    pub async fn register_job(&self, job_id: String, pid: u32, fonts_dir: Option<PathBuf>, config: EncodeJobConfig) {
        let mut map = self.jobs.lock().await;
        map.insert(
            job_id,
            ActiveJob {
                pid,
                fonts_temp_dir: fonts_dir,
                is_paused: false,
                config,
            },
        );
    }

    pub async fn unregister_job(&self, job_id: &str) -> Option<ActiveJob> {
        let mut map = self.jobs.lock().await;
        map.remove(job_id)
    }

    pub async fn get_active_jobs(&self) -> Vec<(String, ActiveJob)> {
        let map = self.jobs.lock().await;
        map.iter().map(|(k, v)| (k.clone(), v.clone())).collect()
    }

    pub async fn has_active_jobs(&self) -> bool {
        let map = self.jobs.lock().await;
        !map.is_empty()
    }
    pub async fn is_cancelled(&self, job_id: &str) -> bool {
        let set = self.cancelled_jobs.lock().await;
        set.contains(job_id)
    }

    pub async fn kill_all_jobs(&self) -> Result<(), String> {
        let mut map = self.jobs.lock().await;
        let mut cancelled = self.cancelled_jobs.lock().await;
        for (job_id, job) in map.drain() {
            cancelled.insert(job_id);
            #[cfg(target_os = "linux")]
            {
                use nix::sys::signal::{kill, Signal};
                use nix::unistd::Pid;
                let _ = kill(Pid::from_raw(job.pid as i32), Signal::SIGKILL);
            }
            #[cfg(target_os = "windows")]
            {
                let _ = std::process::Command::new("taskkill").args(["/F", "/T", "/PID", &job.pid.to_string()]).output();
            }
            if let Some(ref fonts_dir) = job.fonts_temp_dir {
                cleanup_fonts_dir(fonts_dir);
            }
        }
        Ok(())
    }


    pub async fn pause_job(&self, job_id: &str) -> Result<(), String> {
        let mut map = self.jobs.lock().await;
        if let Some(job) = map.get_mut(job_id) {
            if job.is_paused {
                return Ok(());
            }

            #[cfg(target_os = "linux")]
            {
                use nix::sys::signal::{kill, Signal};
                use nix::unistd::Pid;
                kill(Pid::from_raw(job.pid as i32), Signal::SIGSTOP)
                    .map_err(|e| format!("İşlem duraklatılamadı (SIGSTOP): {}", e))?;
            }

            #[cfg(target_os = "windows")]
            {
                unsafe {
                    use windows_sys::Win32::Foundation::{CloseHandle, HANDLE};
                    use windows_sys::Win32::System::Threading::{OpenProcess, PROCESS_SUSPEND_RESUME};

                    type NtSuspendProcessFn = unsafe extern "system" fn(HANDLE) -> i32;
                    let ntdll = windows_sys::Win32::System::LibraryLoader::GetModuleHandleA(b"ntdll.dll\0".as_ptr());
                    if !ntdll.is_null() {
                        let proc = windows_sys::Win32::System::LibraryLoader::GetProcAddress(ntdll, b"NtSuspendProcess\0".as_ptr());
                        if let Some(proc_addr) = proc {
                            let nt_suspend: NtSuspendProcessFn = std::mem::transmute(proc_addr);
                            let handle = OpenProcess(PROCESS_SUSPEND_RESUME, 0, job.pid);
                            if !handle.is_null() {
                                nt_suspend(handle);
                                CloseHandle(handle);
                            }
                        }
                    }
                }
            }

            job.is_paused = true;
            Ok(())
        } else {
            Err("Aktif kodlama işlemi bulunamadı.".to_string())
        }
    }

    pub async fn resume_job(&self, job_id: &str) -> Result<(), String> {
        let mut map = self.jobs.lock().await;
        if let Some(job) = map.get_mut(job_id) {
            if !job.is_paused {
                return Ok(());
            }

            #[cfg(target_os = "linux")]
            {
                use nix::sys::signal::{kill, Signal};
                use nix::unistd::Pid;
                kill(Pid::from_raw(job.pid as i32), Signal::SIGCONT)
                    .map_err(|e| format!("İşlem devam ettirilemedi (SIGCONT): {}", e))?;
            }

            #[cfg(target_os = "windows")]
            {
                unsafe {
                    use windows_sys::Win32::Foundation::{CloseHandle, HANDLE};
                    use windows_sys::Win32::System::Threading::{OpenProcess, PROCESS_SUSPEND_RESUME};

                    type NtResumeProcessFn = unsafe extern "system" fn(HANDLE) -> i32;
                    let ntdll = windows_sys::Win32::System::LibraryLoader::GetModuleHandleA(b"ntdll.dll\0".as_ptr());
                    if !ntdll.is_null() {
                        let proc = windows_sys::Win32::System::LibraryLoader::GetProcAddress(ntdll, b"NtResumeProcess\0".as_ptr());
                        if let Some(proc_addr) = proc {
                            let nt_resume: NtResumeProcessFn = std::mem::transmute(proc_addr);
                            let handle = OpenProcess(PROCESS_SUSPEND_RESUME, 0, job.pid);
                            if !handle.is_null() {
                                nt_resume(handle);
                                CloseHandle(handle);
                            }
                        }
                    }
                }
            }

            job.is_paused = false;
            Ok(())
        } else {
            Err("Aktif kodlama işlemi bulunamadı.".to_string())
        }
    }

    pub async fn cancel_job(&self, job_id: &str) -> Result<(), String> {
        let mut cancelled = self.cancelled_jobs.lock().await;
        cancelled.insert(job_id.to_string());
        let job_opt = self.unregister_job(job_id).await;
        if let Some(job) = job_opt {
            #[cfg(target_os = "linux")]
            {
                use nix::sys::signal::{kill, Signal};
                use nix::unistd::Pid;
                let _ = kill(Pid::from_raw(job.pid as i32), Signal::SIGKILL);
            }
            #[cfg(target_os = "windows")]
            {
                let _ = std::process::Command::new("taskkill").args(["/F", "/T", "/PID", &job.pid.to_string()]).output();
            }
            if let Some(ref fonts_dir) = job.fonts_temp_dir {
                cleanup_fonts_dir(fonts_dir);
            }
        }
        Ok(())
    }
}

pub fn calculate_eta(remaining_secs: f64, speed: f64) -> (f64, String) {
    if speed <= 0.01 || remaining_secs <= 0.0 || remaining_secs.is_nan() || remaining_secs.is_infinite() {
        return (0.0, "--:--:--".to_string());
    }
    let eta_secs = remaining_secs / speed;
    let formatted = format_duration(eta_secs);
    (eta_secs, formatted)
}

/// Returns a non-conflicting output path; appends _N suffix when the target already exists.
fn resolve_unique_output_path(path: &str) -> String {
    if path.is_empty() || !Path::new(path).exists() {
        return path.to_string();
    }
    let p = PathBuf::from(path);
    let stem = p
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| "output".to_string());
    let ext = p
        .extension()
        .map(|e| format!(".{}", e.to_string_lossy()))
        .unwrap_or_default();
    let dir = p
        .parent()
        .map(|d| d.to_path_buf())
        .unwrap_or_else(|| PathBuf::from("."));
    let mut counter = 2u32;
    loop {
        let candidate = dir.join(format!("{}_{}{}", stem, counter, ext));
        if !candidate.exists() {
            return candidate.to_string_lossy().to_string();
        }
        counter += 1;
    }
}

use std::fs::remove_file;

/// Executes an encoding job asynchronously, emitting real-time progress and logs to Tauri frontend.
pub async fn start_encoding_job(
    app: AppHandle,
    process_manager: Arc<ProcessManager>,
    mut config: EncodeJobConfig,
) -> Result<(), String> {
    let job_id = config.id.clone();

    // Erken hatalarda da frontend'e error olayı yayınla (aksi halde UI 'encoding' durumunda takılır)
    let emit_error = |msg: &str| {
        let _ = app.emit(
            "encode-progress",
            EncodeProgress {
                job_id: job_id.clone(),
                status: "error".to_string(),
                error_message: Some(msg.to_string()),
                ..Default::default()
            },
        );
    };

    // 1. Probe input video to get total duration
    let meta = probe_media_file(&config.input_path)
        .map_err(|e| format!("Girdi dosyası doğrulanamadı: {}", e))
        .inspect_err(|e| emit_error(e))?;
    let total_duration_secs = meta.duration_secs;

    // Overwrite protection: never silently clobber an existing output file
    let unique_output = resolve_unique_output_path(&config.output_path);
    if unique_output != config.output_path {
        let _ = app.emit(
            "encode-log",
            JobLogMessage {
                job_id: job_id.clone(),
                line: format!(
                    "[FloraSubs] Çıktı çakışması: '{}' mevcut, yeni hedef '{}'",
                    config.output_path, unique_output
                ),
                stream: "system".to_string(),
                timestamp: chrono::Local::now().format("%H:%M:%S").to_string(),
            },
        );
        config.output_path = unique_output;
    }

    let now_str = chrono::Local::now().format("%H:%M:%S").to_string();
    let _ = app.emit(
        "encode-log",
        JobLogMessage {
            job_id: job_id.clone(),
            line: format!("[FloraSubs] Medya analizi tamamlandı. Süre: {} ({} saniye)", meta.duration_formatted, total_duration_secs),
            stream: "system".to_string(),
            timestamp: now_str.clone(),
        },
    );

    // 2. Prepare subtitle and font attachments if hardsubbing is enabled
    let mut temp_fonts_dir: Option<PathBuf> = None;

    if config.hardsub_enabled {
        if config.subtitle_source == "embedded" {
            let sub_idx = config.subtitle_track_index.unwrap_or(0);
            let temp_sub = std::env::temp_dir().join(format!("florasubs_{}_sub_{}.ass", job_id, sub_idx));

            let _ = app.emit(
                "encode-log",
                JobLogMessage {
                    job_id: job_id.clone(),
                    line: format!("[FloraSubs] Gömülü altyazı akışı #{} ayrıştırılıyor...", sub_idx),
                    stream: "system".to_string(),
                    timestamp: chrono::Local::now().format("%H:%M:%S").to_string(),
                },
            );

            extract_subtitle_track(&config.input_path, sub_idx, &temp_sub).inspect_err(|e| emit_error(e))?;
            config.resolved_subtitle_path = Some(temp_sub.to_string_lossy().to_string());

            // Extract fonts
            if let Ok(Some(fonts_res)) = prepare_job_fonts_dir(&config.input_path, &job_id) {
                let _ = app.emit(
                    "encode-log",
                    JobLogMessage {
                        job_id: job_id.clone(),
                        line: format!("[FloraSubs] {} adet gömülü font başarıyla çıkartıldı.", fonts_res.count),
                        stream: "system".to_string(),
                        timestamp: chrono::Local::now().format("%H:%M:%S").to_string(),
                    },
                );
                config.fonts_dir = Some(fonts_res.temp_dir.clone());
                temp_fonts_dir = Some(PathBuf::from(fonts_res.temp_dir));
            }
        } else if config.subtitle_source == "external" {
            config.resolved_subtitle_path = config.external_subtitle_path.clone();
        }
    }

    // 3. Build FFmpeg command arguments
    let ffmpeg_bin = resolve_ffmpeg_path()
        .ok_or_else(|| "FFmpeg ikili dosyası bulunamadı.".to_string())
        .inspect_err(|e| emit_error(e))?;

    let args = build_ffmpeg_args(&config).inspect_err(|e| emit_error(e))?;

    let _ = app.emit(
        "encode-log",
        JobLogMessage {
            job_id: job_id.clone(),
            line: format!("[FloraSubs] FFmpeg Komutu: {} {}", ffmpeg_bin.display(), args.join(" ")),
            stream: "system".to_string(),
            timestamp: chrono::Local::now().format("%H:%M:%S").to_string(),
        },
    );

    // 4. Spawn child process
    let mut child = Command::new(&ffmpeg_bin)
        .args(&args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("FFmpeg işlemi başlatılamadı: {}", e))
        .inspect_err(|e| emit_error(e))?;

    let pid = match child.id() {
        Some(p) if p > 0 => p,
        _ => {
            let msg = "FFmpeg süreç kimliği (PID) alınamadı.";
            emit_error(msg);
            return Err(msg.to_string());
        }
    };
    process_manager.register_job(job_id.clone(), pid, temp_fonts_dir.clone(), config.clone()).await;

    // 5. Stream stdout (progress key-values) and stderr (logs)
    let stdout = child.stdout.take();
    let stderr = child.stderr.take();

    let app_handle_progress = app.clone();
    let job_id_progress = job_id.clone();

    // Async task reading stdout for real-time progress calculations
    let progress_handle = tokio::spawn(async move {
        if let Some(out) = stdout {
            let mut reader = BufReader::new(out).lines();
            let mut progress = EncodeProgress {
                job_id: job_id_progress.clone(),
                status: "running".to_string(),
                ..Default::default()
            };

            while let Ok(Some(line)) = reader.next_line().await {
                let trimmed = line.trim();
                if let Some((k, v)) = trimmed.split_once('=') {
                    match k {
                        "frame" => {
                            if let Ok(f) = v.parse::<u64>() {
                                progress.frame = f;
                            }
                        }
                        "fps" => {
                            if let Ok(fps) = v.parse::<f64>() {
                                progress.fps = fps;
                            }
                        }
                        "total_size" => {
                            if let Ok(s) = v.parse::<u64>() {
                                progress.size_bytes = s;
                            }
                        }
                        "out_time_us" => {
                            if let Ok(us) = v.parse::<u64>() {
                                let secs = us as f64 / 1_000_000.0;
                                progress.time_secs = secs;
                                progress.time_formatted = format_duration(secs);

                                if total_duration_secs > 0.0 {
                                    let pct = (secs / total_duration_secs * 100.0).clamp(0.0, 100.0);
                                    progress.percentage = (pct * 10.0).round() / 10.0;

                                    let remaining = (total_duration_secs - secs).max(0.0);
                                    let (eta_secs, eta_str) = calculate_eta(remaining, progress.speed);
                                    progress.eta_secs = eta_secs;
                                    progress.eta_formatted = eta_str;
                                }
                            }
                        }
                        "bitrate" => {
                            let clean_b = v.replace("kbits/s", "").trim().to_string();
                            if let Ok(b) = clean_b.parse::<f64>() {
                                progress.bitrate_kbps = b;
                            }
                        }
                        "speed" => {
                            let clean_s = v.replace('x', "").trim().to_string();
                            if let Ok(s) = clean_s.parse::<f64>() {
                                progress.speed = s;
                            }
                        }
                        "progress" => {
                            let _ = app_handle_progress.emit("encode-progress", progress.clone());
                            if v == "end" {
                                break;
                            }
                        }
                        _ => {}
                    }
                }
            }
        }
    });

    let stderr_tail: Arc<Mutex<Vec<String>>> = Arc::new(Mutex::new(Vec::new()));
    let stderr_tail_clone = stderr_tail.clone();

    // Async task reading stderr for live terminal log output
    let app_handle_log = app.clone();
    let job_id_log = job_id.clone();
    let log_handle = tokio::spawn(async move {
        if let Some(err) = stderr {
            let mut reader = BufReader::new(err).lines();
            while let Ok(Some(line)) = reader.next_line().await {
                if !line.trim().is_empty() {
                    let mut tail = stderr_tail_clone.lock().await;
                    tail.push(line.clone());
                    if tail.len() > 30 {
                        tail.remove(0);
                    }

                    let _ = app_handle_log.emit(
                        "encode-log",
                        JobLogMessage {
                            job_id: job_id_log.clone(),
                            line,
                            stream: "stderr".to_string(),
                            timestamp: chrono::Local::now().format("%H:%M:%S").to_string(),
                        },
                    );
                }
            }
        }
    });

    // Wait for child process exit
    let exit_status = child.wait().await;
    let _ = progress_handle.await;
    let _ = log_handle.await;

    process_manager.unregister_job(&job_id).await;

    // Clean up temporary files
    if let Some(ref fonts_dir) = temp_fonts_dir {
        cleanup_fonts_dir(fonts_dir);
    }
    if let Some(ref sub_path) = config.resolved_subtitle_path {
       if sub_path.contains(&format!("florasubs_{}_sub_", job_id)) {
           let _ = remove_file(sub_path);
       }
    }

    match exit_status {
        Ok(status) => {
            if status.success() {
                let _ = app.emit(
                    "encode-progress",
                    EncodeProgress {
                        job_id: job_id.clone(),
                        status: "completed".to_string(),
                        percentage: 100.0,
                        time_formatted: format_duration(total_duration_secs),
                        ..Default::default()
                    },
                );
                Ok(())
            } else if process_manager.is_cancelled(&job_id).await {
                let _ = app.emit(
                    "encode-progress",
                    EncodeProgress {
                        job_id: job_id.clone(),
                        status: "cancelled".to_string(),
                        ..Default::default()
                    },
                );
                Err("İşlem kullanıcı tarafından iptal edildi.".to_string())
            } else {
                let code = status.code().unwrap_or(-1);
                let _ = app.emit(
                    "encode-progress",
                    EncodeProgress {
                        job_id: job_id.clone(),
                        status: "error".to_string(),
                        error_message: Some(format!("FFmpeg çıkış kodu: {}", code)),
                        ..Default::default()
                    },
                );
                Err(format!("FFmpeg başarısız oldu (kod: {})", code))
            }
        }
        Err(e) => {
            let _ = app.emit(
                "encode-progress",
                EncodeProgress {
                    job_id: job_id.clone(),
                    status: "error".to_string(),
                    error_message: Some(e.to_string()),
                    ..Default::default()
                },
            );
            Err(e.to_string())
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_resolve_unique_output_path() {
        let dir = tempfile::tempdir().unwrap();
        let target = dir.path().join("out.mp4");
        std::fs::write(&target, b"x").unwrap();

        let u1 = resolve_unique_output_path(target.to_str().unwrap());
        assert!(u1.ends_with("out_2.mp4"), "got: {}", u1);

        std::fs::write(dir.path().join("out_2.mp4"), b"x").unwrap();
        let u2 = resolve_unique_output_path(target.to_str().unwrap());
        assert!(u2.ends_with("out_3.mp4"), "got: {}", u2);

        assert_eq!(resolve_unique_output_path(""), "");
        assert_eq!(
            resolve_unique_output_path("/yok/boyle/dosya.mp4"),
            "/yok/boyle/dosya.mp4"
        );
    }

    #[test]
    fn test_calculate_eta() {
        let (eta_secs, eta_str) = calculate_eta(100.0, 2.0);
        assert_eq!(eta_secs, 50.0);
        assert_eq!(eta_str, "00:00:50");

        let (eta_zero_speed, eta_zero_str) = calculate_eta(100.0, 0.0);
        assert_eq!(eta_zero_speed, 0.0);
        assert_eq!(eta_zero_str, "--:--:--");
    }

    #[tokio::test]
    async fn test_process_manager_lifecycle() {
        let pm = ProcessManager::new();
        assert!(!pm.has_active_jobs().await);

        let cfg = EncodeJobConfig::default();
        pm.register_job("job_1".to_string(), 12345, None, cfg).await;
        assert!(pm.has_active_jobs().await);

        let active = pm.get_active_jobs().await;
        assert_eq!(active.len(), 1);
        assert_eq!(active[0].0, "job_1");
        assert_eq!(active[0].1.pid, 12345);
        assert!(!active[0].1.is_paused);

        let unregistered = pm.unregister_job("job_1").await;
        assert!(unregistered.is_some());
        assert!(!pm.has_active_jobs().await);
    }
}