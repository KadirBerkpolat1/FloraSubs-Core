use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::path::Path;
use std::process::Command;
use crate::engine::gpu_probe::resolve_ffprobe_path;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct VideoStreamInfo {
    pub index: usize,
    pub codec: String,
    pub width: u32,
    pub height: u32,
    pub fps: f64,
    pub pix_fmt: String,
    pub bitrate: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AudioStreamInfo {
    pub index: usize,
    pub audio_index: usize,
    pub codec: String,
    pub language: String,
    pub title: String,
    pub channels: u32,
    pub sample_rate: u32,
    pub bitrate: Option<u64>,
    pub is_default: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SubtitleStreamInfo {
    pub index: usize,
    pub subtitle_index: usize,
    pub codec: String,
    pub language: String,
    pub title: String,
    pub is_default: bool,
    pub is_forced: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AttachmentInfo {
    pub index: usize,
    pub filename: String,
    pub mime_type: String,
    pub is_font: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct MediaMetadata {
    pub file_path: String,
    pub file_name: String,
    pub file_size: u64,
    pub duration_secs: f64,
    pub duration_formatted: String,
    pub video_stream: Option<VideoStreamInfo>,
    pub audio_streams: Vec<AudioStreamInfo>,
    pub subtitle_streams: Vec<SubtitleStreamInfo>,
    pub attachments: Vec<AttachmentInfo>,
    pub font_count: usize,
}

pub fn format_duration(seconds: f64) -> String {
    if seconds <= 0.0 || seconds.is_nan() || seconds.is_infinite() {
        return "00:00:00".to_string();
    }
    let total_secs = seconds.round() as u64;
    let hours = total_secs / 3600;
    let mins = (total_secs % 3600) / 60;
    let secs = total_secs % 60;
    format!("{:02}:{:02}:{:02}", hours, mins, secs)
}

fn parse_framerate(fps_str: &str) -> f64 {
    if let Some((num_str, den_str)) = fps_str.split_once('/') {
        if let (Ok(num), Ok(den)) = (num_str.parse::<f64>(), den_str.parse::<f64>()) {
            if den > 0.0 {
                return num / den;
            }
        }
    }
    fps_str.parse::<f64>().unwrap_or(24.0)
}

pub fn normalize_file_path(raw: &str) -> String {
    let mut clean = raw.trim().to_string();
    if clean.starts_with("file://") {
        clean = clean.trim_start_matches("file://").to_string();
        #[cfg(target_os = "windows")]
        if clean.starts_with('/') && clean.len() > 2 && clean.chars().nth(2) == Some(':') {
            clean = clean.trim_start_matches('/').to_string();
        }
        if let Ok(decoded) = urlencoding::decode(&clean) {
            clean = decoded.into_owned();
        }
    }
    clean
}

/// Analyzes a media file via ffprobe and returns full metadata
pub fn probe_media_file<P: AsRef<Path>>(path: P) -> Result<MediaMetadata, String> {
    let raw_str = path.as_ref().to_string_lossy();
    let normalized = normalize_file_path(&raw_str);
    let p = Path::new(&normalized);
    if !p.exists() {
        return Err(format!("Dosya bulunamadı: {}", p.display()));
    }
    let ffprobe_bin = resolve_ffprobe_path()
        .ok_or_else(|| "ffprobe ikili dosyası bulunamadı. Lütfen ffprobe'un yüklü olduğundan emin olun.".to_string())?;

    let output = Command::new(&ffprobe_bin)
        .args([
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
        ])
        .arg(p)
        .output()
        .map_err(|e| format!("ffprobe çalıştırılamadı: {}", e))?;

    if !output.status.success() {
        let err_msg = String::from_utf8_lossy(&output.stderr);
        return Err(format!("ffprobe medya analiz hatası: {}", err_msg));
    }

    let json_str = String::from_utf8_lossy(&output.stdout);
    parse_ffprobe_json(&json_str, p)
}

pub fn parse_ffprobe_json(json_str: &str, file_path: &Path) -> Result<MediaMetadata, String> {
    let root: Value = serde_json::from_str(json_str)
        .map_err(|e| format!("ffprobe çıktısı JSON olarak ayrıştırılamadı: {}", e))?;

    let file_size = std::fs::metadata(file_path).map(|m| m.len()).unwrap_or(0);
    let file_name = file_path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();

    let duration_secs = root
        .get("format")
        .and_then(|f| f.get("duration"))
        .and_then(|d| d.as_str())
        .and_then(|s| s.parse::<f64>().ok())
        .unwrap_or(0.0);

    let duration_formatted = format_duration(duration_secs);

    let mut video_stream: Option<VideoStreamInfo> = None;
    let mut audio_streams: Vec<AudioStreamInfo> = Vec::new();
    let mut subtitle_streams: Vec<SubtitleStreamInfo> = Vec::new();
    let mut attachments: Vec<AttachmentInfo> = Vec::new();

    let mut audio_count = 0;
    let mut subtitle_count = 0;

    if let Some(streams) = root.get("streams").and_then(|s| s.as_array()) {
        for stream in streams {
            let codec_type = stream
                .get("codec_type")
                .and_then(|t| t.as_str())
                .unwrap_or("");
            let index = stream
                .get("index")
                .and_then(|i| i.as_u64())
                .unwrap_or(0) as usize;
            let codec_name = stream
                .get("codec_name")
                .and_then(|c| c.as_str())
                .unwrap_or("unknown")
                .to_string();

            let tags = stream.get("tags");
            let language = tags
                .and_then(|t| t.get("language").or_else(|| t.get("LANGUAGE")))
                .and_then(|l| l.as_str())
                .unwrap_or("und")
                .to_string();

            let title = tags
                .and_then(|t| t.get("title").or_else(|| t.get("TITLE")).or_else(|| t.get("handler_name")))
                .and_then(|t| t.as_str())
                .unwrap_or("")
                .to_string();

            let disposition = stream.get("disposition");
            let is_default = disposition
                .and_then(|d| d.get("default"))
                .and_then(|v| v.as_u64())
                .map(|v| v == 1)
                .unwrap_or(false);
            let is_forced = disposition
                .and_then(|d| d.get("forced"))
                .and_then(|v| v.as_u64())
                .map(|v| v == 1)
                .unwrap_or(false);

            match codec_type {
                "video" => {
                    if video_stream.is_none() {
                        let width = stream.get("width").and_then(|w| w.as_u64()).unwrap_or(0) as u32;
                        let height = stream.get("height").and_then(|h| h.as_u64()).unwrap_or(0) as u32;
                        let r_frame_rate = stream.get("r_frame_rate").and_then(|f| f.as_str()).unwrap_or("24/1");
                        let fps = parse_framerate(r_frame_rate);
                        let pix_fmt = stream.get("pix_fmt").and_then(|p| p.as_str()).unwrap_or("yuv420p").to_string();
                        let bitrate = stream.get("bit_rate").and_then(|b| b.as_str()).and_then(|s| s.parse::<u64>().ok());

                        video_stream = Some(VideoStreamInfo {
                            index,
                            codec: codec_name,
                            width,
                            height,
                            fps,
                            pix_fmt,
                            bitrate,
                        });
                    }
                }
                "audio" => {
                    let channels = stream.get("channels").and_then(|c| c.as_u64()).unwrap_or(2) as u32;
                    let sample_rate = stream.get("sample_rate").and_then(|s| s.as_str()).and_then(|s| s.parse::<u32>().ok()).unwrap_or(48000);
                    let bitrate = stream.get("bit_rate").and_then(|b| b.as_str()).and_then(|s| s.parse::<u64>().ok());

                    audio_streams.push(AudioStreamInfo {
                        index,
                        audio_index: audio_count,
                        codec: codec_name,
                        language,
                        title,
                        channels,
                        sample_rate,
                        bitrate,
                        is_default,
                    });
                    audio_count += 1;
                }
                "subtitle" => {
                    subtitle_streams.push(SubtitleStreamInfo {
                        index,
                        subtitle_index: subtitle_count,
                        codec: codec_name,
                        language,
                        title,
                        is_default,
                        is_forced,
                    });
                    subtitle_count += 1;
                }
                "attachment" => {
                    let filename = tags
                        .and_then(|t| t.get("filename").or_else(|| t.get("FILENAME")))
                        .and_then(|f| f.as_str())
                        .unwrap_or("")
                        .to_string();

                    let mime_type = tags
                        .and_then(|t| t.get("mimetype").or_else(|| t.get("MIMETYPE")).or_else(|| t.get("mime_type")))
                        .and_then(|m| m.as_str())
                        .unwrap_or("")
                        .to_string();

                    let lower_name = filename.to_lowercase();
                    let lower_mime = mime_type.to_lowercase();
                    let is_font = lower_name.ends_with(".ttf")
                        || lower_name.ends_with(".otf")
                        || lower_name.ends_with(".ttc")
                        || lower_mime.contains("font")
                        || lower_mime.contains("truetype")
                        || lower_mime.contains("opentype");

                    attachments.push(AttachmentInfo {
                        index,
                        filename,
                        mime_type,
                        is_font,
                    });
                }
                _ => {}
            }
        }
    }

    let font_count = attachments.iter().filter(|a| a.is_font).count();

    Ok(MediaMetadata {
        file_path: file_path.to_string_lossy().to_string(),
        file_name,
        file_size,
        duration_secs,
        duration_formatted,
        video_stream,
        audio_streams,
        subtitle_streams,
        attachments,
        font_count,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn test_format_duration() {
        assert_eq!(format_duration(0.0), "00:00:00");
        assert_eq!(format_duration(1425.4), "00:23:45");
        assert_eq!(format_duration(3665.0), "01:01:05");
    }

    #[test]
    fn test_parse_framerate() {
        assert!((parse_framerate("24000/1001") - 23.976023).abs() < 0.001);
        assert!((parse_framerate("30/1") - 30.0).abs() < 0.001);
        assert!((parse_framerate("60000/1001") - 59.940059).abs() < 0.001);
    }

    #[test]
    fn test_parse_ffprobe_sample_json() {
        let sample_json = r#"{
            "streams": [
                {
                    "index": 0,
                    "codec_name": "hevc",
                    "codec_type": "video",
                    "width": 1920,
                    "height": 1080,
                    "r_frame_rate": "24000/1001",
                    "pix_fmt": "yuv420p10le"
                },
                {
                    "index": 1,
                    "codec_name": "flac",
                    "codec_type": "audio",
                    "channels": 2,
                    "sample_rate": "48000",
                    "tags": { "language": "jpn", "title": "Japanese FLAC 2.0" },
                    "disposition": { "default": 1 }
                },
                {
                    "index": 2,
                    "codec_name": "ass",
                    "codec_type": "subtitle",
                    "tags": { "language": "tur", "title": "Türkçe Fansub [FloraSubs]" },
                    "disposition": { "default": 1 }
                },
                {
                    "index": 3,
                    "codec_name": "none",
                    "codec_type": "attachment",
                    "tags": { "filename": "TrebuchetMS_Bold.ttf", "mimetype": "application/x-truetype-font" }
                }
            ],
            "format": {
                "duration": "1425.416667",
                "size": "450000000"
            }
        }"#;

        let meta = parse_ffprobe_json(sample_json, &PathBuf::from("/fake/anime_ep01.mkv")).unwrap();
        assert_eq!(meta.file_name, "anime_ep01.mkv");
        assert_eq!(meta.duration_formatted, "00:23:45");
        assert!(meta.video_stream.is_some());
        let v = meta.video_stream.unwrap();
        assert_eq!(v.width, 1920);
        assert_eq!(v.height, 1080);
        assert_eq!(v.codec, "hevc");

        assert_eq!(meta.audio_streams.len(), 1);
        assert_eq!(meta.audio_streams[0].language, "jpn");
        assert_eq!(meta.audio_streams[0].title, "Japanese FLAC 2.0");

        assert_eq!(meta.subtitle_streams.len(), 1);
        assert_eq!(meta.subtitle_streams[0].codec, "ass");
        assert_eq!(meta.subtitle_streams[0].language, "tur");
        assert_eq!(meta.subtitle_streams[0].title, "Türkçe Fansub [FloraSubs]");

        assert_eq!(meta.attachments.len(), 1);
        assert_eq!(meta.font_count, 1);
        assert_eq!(meta.attachments[0].filename, "TrebuchetMS_Bold.ttf");
    }

    #[test]
    fn test_normalize_file_path_percent_decoding() {
        let raw = "file:///home/sevelebeci/%C4%B0ndirilenler/%5BJudas%5D%20Initial%20D.mkv";
        let norm = normalize_file_path(raw);
        assert_eq!(norm, "/home/sevelebeci/İndirilenler/[Judas] Initial D.mkv");
    }
}
