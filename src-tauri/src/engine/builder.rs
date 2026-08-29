use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelSettings {
    pub upscale_enabled: bool,
    pub upscale_model: String,   // e.g. "2x_Adore_renarchi_fp16_DML_onnxslim", "Anime4K_Upscale_HD", "RealESRGAN_x2plus"
    pub backend: String,         // "DML", "CUDA", "Vulkan", "CPU", "Shader"
    pub frame_gen_enabled: bool,
    pub frame_gen_model: String, // "SVP", "RIFE", "minterpolate"
    pub target_fps: u32,         // 24 - 255 (default 60)
    #[serde(default)]
    pub target_height: Option<u32>, // Hedef yükseklik (None = kaynak x2)
}

impl Default for ModelSettings {
    fn default() -> Self {
        Self {
            upscale_enabled: false,
            upscale_model: "Anime4K_Upscale_HD".to_string(),
            backend: "DML".to_string(),
            frame_gen_enabled: false,
            frame_gen_model: "SVP".to_string(),
            target_fps: 60,
            target_height: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FilterSettings {
    pub line_darkening_enabled: bool,
    pub line_darkening_value: u32, // 0 - 255 (default 128)
    pub sharpness_enabled: bool,
    pub sharpness_value: u32,      // 0 - 255 (default 128)
    pub grain_enabled: bool,
    pub grain_value: u32,          // 0 - 100 (default 15)
}

impl Default for FilterSettings {
    fn default() -> Self {
        Self {
            line_darkening_enabled: false,
            line_darkening_value: 128,
            sharpness_enabled: false,
            sharpness_value: 128,
            grain_enabled: false,
            grain_value: 15,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EncodeJobConfig {
    pub id: String,
    pub input_path: String,
    pub output_path: String,
    pub container: String, // "mp4", "mkv", "webm"

    // Video settings
    pub encoder: String,        // "h264_nvenc", "hevc_nvenc", "av1_nvenc", "libx264", "libx265", "libsvtav1", "h264_qsv", "hevc_qsv", "h264_amf", "hevc_amf", "av1_amf"
    pub threads: u32,           // 0 = auto, 1-32 CPU threads
    pub use_bitrate: bool,      // Bitrate Kullan (CRF/CQ yerine ABR)
    pub average_bitrate_kbps: u32, // e.g. 4000
    pub crf: u32,               // 0 - 51 (default 22)
    pub preset: String,         // "slow", "medium", "fast", "p4", "p6", etc.
    pub pixel_format: String,   // "yuv420p", "yuv420p10le"
    pub b_frames: u32,          // e.g. 4
    pub custom_video_args: Option<String>,

    // Audio settings
    pub audio_track_index: usize,
    pub audio_codec: String,    // "aac", "libopus", "copy", "flac", "mp3"
    pub audio_bitrate_kbps: u32,// e.g. 192

    // Subtitle & Hardsub settings
    pub hardsub_enabled: bool,
    pub subtitle_source: String, // "embedded" | "external" | "none"
    pub subtitle_track_index: Option<usize>,
    pub external_subtitle_path: Option<String>,
    pub resolved_subtitle_path: Option<String>,
    pub fonts_dir: Option<String>,

    // Intro Video Concat
    pub intro_enabled: bool,
    pub intro_video_path: Option<String>,

    // Model & AI Settings
    pub model_settings: ModelSettings,

    // Advanced Filters
    pub filter_settings: FilterSettings,

    // Web streaming faststart
    pub faststart: bool,
}

impl Default for EncodeJobConfig {
    fn default() -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            input_path: "".to_string(),
            output_path: "".to_string(),
            container: "mp4".to_string(),
            encoder: "libx264".to_string(),
            threads: 0,
            use_bitrate: false,
            average_bitrate_kbps: 4000,
            crf: 22,
            preset: "slow".to_string(),
            pixel_format: "yuv420p".to_string(),
            b_frames: 4,
            custom_video_args: None,
            audio_track_index: 0,
            audio_codec: "aac".to_string(),
            audio_bitrate_kbps: 192,
            hardsub_enabled: true,
            subtitle_source: "embedded".to_string(),
            subtitle_track_index: Some(0),
            external_subtitle_path: None,
            resolved_subtitle_path: None,
            fonts_dir: None,
            intro_enabled: false,
            intro_video_path: None,
            model_settings: ModelSettings::default(),
            filter_settings: FilterSettings::default(),
            faststart: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PresetProfile {
    pub id: String,
    pub name: String,
    pub description: String,
    pub container: String,
    pub encoder: String,
    pub use_bitrate: bool,
    pub average_bitrate_kbps: u32,
    pub crf: u32,
    pub preset: String,
    pub pixel_format: String,
    pub audio_codec: String,
    pub audio_bitrate_kbps: u32,
    pub b_frames: u32,
    pub faststart: bool,
}

pub fn get_preset_profiles() -> Vec<PresetProfile> {
    vec![
        PresetProfile {
            id: "anime_web_x264".to_string(),
            name: "Web Anime (H.264 / AAC - Standart)".to_string(),
            description: "Fansub siteleri ve tüm tarayıcılar için en uyumlu, yüksek kaliteli H.264 profili.".to_string(),
            container: "mp4".to_string(),
            encoder: "libx264".to_string(),
            use_bitrate: false,
            average_bitrate_kbps: 4000,
            crf: 20,
            preset: "slow".to_string(),
            pixel_format: "yuv420p".to_string(),
            audio_codec: "aac".to_string(),
            audio_bitrate_kbps: 192,
            b_frames: 4,
            faststart: true,
        },
        PresetProfile {
            id: "anime_nextgen_av1".to_string(),
            name: "Next-Gen Anime (AV1 / Opus 10-Bit)".to_string(),
            description: "Ultra yüksek sıkıştırma verimliliği, film-grain koruma ve 10-bit renk derinliği.".to_string(),
            container: "mp4".to_string(),
            encoder: "libsvtav1".to_string(),
            use_bitrate: false,
            average_bitrate_kbps: 3000,
            crf: 24,
            preset: "6".to_string(),
            pixel_format: "yuv420p10le".to_string(),
            audio_codec: "libopus".to_string(),
            audio_bitrate_kbps: 128,
            b_frames: 4,
            faststart: true,
        },
        PresetProfile {
            id: "anime_master_av1_fast".to_string(),
            name: "Master AV1 Ultra Hızlı (CRF 15 / Preset 7)".to_string(),
            description: "SVT-AV1 Preset 7 ve CRF 15 ile yüksek hızlı render ve kristal netlikte master görüntü.".to_string(),
            container: "mp4".to_string(),
            encoder: "libsvtav1".to_string(),
            use_bitrate: false,
            average_bitrate_kbps: 5000,
            crf: 15,
            preset: "7".to_string(),
            pixel_format: "yuv420p10le".to_string(),
            audio_codec: "aac".to_string(),
            audio_bitrate_kbps: 192,
            b_frames: 5,
            faststart: true,
        },
        PresetProfile {
            id: "anime_fansub_hevc10".to_string(),
            name: "Master Arşiv (HEVC x265 10-Bit)".to_string(),
            description: "Gelişmiş 10-bit HEVC x265 CPU kodlaması ile bantlaşmayı (color banding) yok eden arşiv profili.".to_string(),
            container: "mkv".to_string(),
            encoder: "libx265".to_string(),
            use_bitrate: false,
            average_bitrate_kbps: 4500,
            crf: 21,
            preset: "slow".to_string(),
            pixel_format: "yuv420p10le".to_string(),
            audio_codec: "aac".to_string(),
            audio_bitrate_kbps: 256,
            b_frames: 4,
            faststart: false,
        },
        PresetProfile {
            id: "gpu_nvidia_fast".to_string(),
            name: "Ultra Hızlı GPU (NVIDIA NVENC HEVC)".to_string(),
            description: "NVIDIA GeForce GPU donanım hızlandırması ile saniyede 150+ FPS ultra hızlı render.".to_string(),
            container: "mp4".to_string(),
            encoder: "hevc_nvenc".to_string(),
            use_bitrate: false,
            average_bitrate_kbps: 4000,
            crf: 22,
            preset: "p6".to_string(),
            pixel_format: "yuv420p".to_string(),
            audio_codec: "aac".to_string(),
            audio_bitrate_kbps: 192,
            b_frames: 3,
            faststart: true,
        },
        PresetProfile {
            id: "gpu_amd_fast".to_string(),
            name: "Ultra Hızlı GPU (AMD Radeon AMF)".to_string(),
            description: "AMD Radeon GPU donanım hızlandırması ile anında bitirme profili.".to_string(),
            container: "mp4".to_string(),
            encoder: "hevc_amf".to_string(),
            use_bitrate: false,
            average_bitrate_kbps: 4000,
            crf: 22,
            preset: "quality".to_string(),
            pixel_format: "yuv420p".to_string(),
            audio_codec: "aac".to_string(),
            audio_bitrate_kbps: 192,
            b_frames: 3,
            faststart: true,
        },
    ]
}

/// Escapes a file or folder path for inclusion inside an FFmpeg filter argument (e.g. `subtitles='...'`).
pub fn escape_ffmpeg_filter_path(path: &str) -> String {
    let normalized = path.replace('\\', "/");
    let mut escaped = String::new();

    for c in normalized.chars() {
        match c {
            ':' => escaped.push_str("\\:"),
            '\'' => escaped.push_str("'\\''"),
            '[' => escaped.push_str("\\["),
            ']' => escaped.push_str("\\]"),
            ';' => escaped.push_str("\\;"),
            ',' => escaped.push_str("\\,"),
            _ => escaped.push(c),
        }
    }

    escaped
}

/// Builds the subtitles filter string with optional fontsdir.
pub fn build_subtitles_filter(sub_path: &str, fonts_dir: Option<&str>) -> String {
    let escaped_sub = escape_ffmpeg_filter_path(sub_path);
    if let Some(f_dir) = fonts_dir {
        if !f_dir.trim().is_empty() {
            let escaped_fonts = escape_ffmpeg_filter_path(f_dir);
            return format!("subtitles='{}':fontsdir='{}':alpha=1", escaped_sub, escaped_fonts);
        }
    }
    format!("subtitles='{}':alpha=1", escaped_sub)
}
/// Builds the complete FFmpeg argument vector based on the configuration.
pub fn build_ffmpeg_args(config: &EncodeJobConfig) -> Result<Vec<String>, String> {
    let mut args: Vec<String> = Vec::new();

    // Overwrite output files without asking
    args.push("-y".to_string());

    let is_vaapi = config.encoder.ends_with("_vaapi");

    // VAAPI Hardware Device setup (must precede input args)
    if is_vaapi {
        let vaapi_dev = if Path::new("/dev/dri/renderD128").exists() {
            "/dev/dri/renderD128"
        } else if Path::new("/dev/dri/card0").exists() {
            "/dev/dri/card0"
        } else {
            "/dev/dri/renderD128"
        };
        args.push("-vaapi_device".to_string());
        args.push(vaapi_dev.to_string());
    }

    // Progress to stdout
    args.push("-nostats".to_string());
    args.push("-progress".to_string());
    args.push("pipe:1".to_string());

    // CPU Threads (Decoder threads clamped to max 16 to prevent decoder thread exhaustion / instability)
    if config.threads > 0 {
        let dec_threads = config.threads.min(16);
        args.push("-threads".to_string());
        args.push(dec_threads.to_string());
        args.push("-filter_threads".to_string());
        args.push(config.threads.to_string());
        args.push("-filter_complex_threads".to_string());
        args.push(config.threads.to_string());
    }

    // Build video filter chain parts
    let mut vf_parts: Vec<String> = Vec::new();

    // 1. AI Upscaling / Resolution Scaling (Executed before subtitles to render subs natively at target resolution)
    if config.model_settings.upscale_enabled {
        let model_id = &config.model_settings.upscale_model;
        if let Some(h) = config.model_settings.target_height {
            vf_parts.push(format!("scale=-2:{}:flags=lanczos+accurate_rnd", h));
        } else if model_id.starts_with("4x") || model_id.contains("4x") {
            vf_parts.push("scale=iw*4:ih*4:flags=lanczos+accurate_rnd".to_string());
        } else {
            vf_parts.push("scale=iw*2:ih*2:flags=lanczos+accurate_rnd".to_string());
        }
        // Force 1:1 square pixel aspect ratio to prevent distorted subtitles & stretched playback
        vf_parts.push("setsar=1".to_string());
    }

    // 2. Frame Interpolation / FPS Generation (Supports up to 255 FPS)
    if config.model_settings.frame_gen_enabled {
        let target_fps = config.model_settings.target_fps.clamp(24, 255);
        let model = &config.model_settings.frame_gen_model;

        if model == "minterpolate" || model.contains("minterpolate") {
            vf_parts.push(format!("minterpolate=fps={}:mi_mode=blend", target_fps));
        } else {
            // Hardware-efficient high-framerate conversion (SVP / RIFE / Framerate)
            vf_parts.push(format!("fps=fps={}", target_fps));
        }
    }

    // 3. Subtitle Hardsubbing
    if config.hardsub_enabled {
        if let Some(sub_path) = &config.resolved_subtitle_path {
            vf_parts.push(build_subtitles_filter(sub_path, config.fonts_dir.as_deref()));
        }
    }

    // 4. Line Darkening Filter (0 - 255 slider, normalized to curves/eq)
    if config.filter_settings.line_darkening_enabled {
        let val = config.filter_settings.line_darkening_value as f64;
        let intensity = (val / 255.0).clamp(0.1, 1.0);
        let mid_point = 0.50 - (intensity * 0.08);
        vf_parts.push(format!("curves=all='0/0 0.5/{:.3} 1/1'", mid_point));
    }

    // 5. Sharpness Filter (0 - 255 slider)
    if config.filter_settings.sharpness_enabled {
        let val = config.filter_settings.sharpness_value as f64;
        let amount = ((val / 255.0) * 1.5).clamp(0.1, 2.0);
        vf_parts.push(format!("unsharp=5:5:{:.2}:5:5:0.0", amount));
    }

    // 6. Film Grain / Noise
    if config.filter_settings.grain_enabled {
        let val = config.filter_settings.grain_value as f64;
        let noise_strength = (val / 10.0).clamp(1.0, 20.0);
        vf_parts.push(format!("noise=alls={:.1}:allf=t+u", noise_strength));
    }
    // 7. VAAPI Hardware Surface Upload
    if is_vaapi {
        let upload_fmt = if config.pixel_format.contains("10") {
            "format=p010,hwupload"
        } else {
            "format=nv12,hwupload"
        };
        vf_parts.push(upload_fmt.to_string());
    }

    // Handle Intro Concatenation vs Single Input
    if config.intro_enabled && config.intro_video_path.as_ref().map(|p| !p.trim().is_empty()).unwrap_or(false) {
        let intro_path = config.intro_video_path.as_ref().unwrap();
        args.push("-i".to_string());
        args.push(intro_path.clone());

        args.push("-i".to_string());
        args.push(config.input_path.clone());

        let extra_vf = if !vf_parts.is_empty() {
            format!(",{}", vf_parts.join(","))
        } else {
            String::new()
        };

        let vaapi_upload = if is_vaapi {
            if config.pixel_format.contains("10") {
                ",format=p010,hwupload"
            } else {
                ",format=nv12,hwupload"
            }
        } else {
            ""
        };

        let filter_complex = format!(
            "[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1[v0];\
             [0:a]aformat=sample_rates=48000:channel_layouts=stereo[a0];\
             [1:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1[v1];\
             [1:a:{a_idx}]aformat=sample_rates=48000:channel_layouts=stereo[a1];\
             [v0][a0][v1][a1]concat=n=2:v=1:a=1[v_concat][a_concat];\
             [v_concat]format={pix_fmt}{extra_vf}{vaapi_upload}[v_out]",
            a_idx = config.audio_track_index,
            pix_fmt = config.pixel_format,
            extra_vf = extra_vf,
            vaapi_upload = vaapi_upload
        );

        args.push("-filter_complex".to_string());
        args.push(filter_complex);

        args.push("-map".to_string());
        args.push("[v_out]".to_string());

        args.push("-map".to_string());
        args.push("[a_concat]".to_string());
    } else {
        // Single Input
        args.push("-i".to_string());
        args.push(config.input_path.clone());

        if !vf_parts.is_empty() {
            args.push("-vf".to_string());
            args.push(vf_parts.join(","));
        }

        args.push("-map".to_string());
        args.push("0:v:0".to_string());

        args.push("-map".to_string());
        args.push(format!("0:a:{}?", config.audio_track_index));
    }

    // Video Encoder Settings
    args.push("-c:v".to_string());
    args.push(config.encoder.clone());

    // Pixel format
    args.push("-pix_fmt".to_string());
    if is_vaapi {
        args.push("vaapi".to_string());
    } else {
        args.push(config.pixel_format.clone());
    }
    // Rate Control and Quality settings
    let is_bitrate = config.use_bitrate;
    let crf = config.crf;

    match config.encoder.as_str() {
        "libx264" => {
            if is_bitrate {
                args.push("-b:v".to_string());
                args.push(format!("{}k", config.average_bitrate_kbps));
            } else {
                args.push("-crf".to_string());
                args.push(crf.to_string());
            }
            args.push("-preset".to_string());
            args.push(config.preset.clone());
            args.push("-tune".to_string());
            args.push("animation".to_string());
            args.push("-bf".to_string());
            args.push(config.b_frames.to_string());
            if config.threads > 0 {
                args.push("-threads:v".to_string());
                args.push(config.threads.to_string());
                args.push("-x264-params".to_string());
                args.push(format!("threads={}", config.threads));
            }
        }
        "libx265" => {
            if is_bitrate {
                args.push("-b:v".to_string());
                args.push(format!("{}k", config.average_bitrate_kbps));
            } else {
                args.push("-crf".to_string());
                args.push(crf.to_string());
            }
            args.push("-preset".to_string());
            args.push(config.preset.clone());
            args.push("-bf".to_string());
            args.push(config.b_frames.to_string());
            if config.threads > 0 {
                args.push("-threads:v".to_string());
                args.push(config.threads.to_string());
            }
            let mut x265_opts = Vec::new();
            if config.threads > 0 {
                x265_opts.push(format!("pools={}", config.threads));
            }
            x265_opts.push("no-sao=1".to_string());
            x265_opts.push("aq-mode=3".to_string());
            x265_opts.push("aq-strength=0.8".to_string());
            x265_opts.push("qcomp=0.70".to_string());
            args.push("-x265-params".to_string());
            args.push(x265_opts.join(":"));
        }
        "libsvtav1" => {
            if is_bitrate {
                args.push("-b:v".to_string());
                args.push(format!("{}k", config.average_bitrate_kbps));
            } else {
                args.push("-crf".to_string());
                args.push(crf.to_string());
            }
            args.push("-preset".to_string());
            args.push(config.preset.clone());
            args.push("-bf".to_string());
            args.push(config.b_frames.to_string());
            let lp = if config.threads > 0 { config.threads } else { 16 };
            let mut svt_params = vec!["tune=0".to_string(), format!("lp={}", lp)];
            if config.filter_settings.grain_enabled {
                let grain_val = (config.filter_settings.grain_value / 4).clamp(1, 16);
                svt_params.push(format!("film-grain={}", grain_val));
            }
            args.push("-svtav1-params".to_string());
            args.push(svt_params.join(":"));
        }
        "h264_nvenc" | "hevc_nvenc" | "av1_nvenc" => {
            if is_bitrate {
                args.push("-b:v".to_string());
                args.push(format!("{}k", config.average_bitrate_kbps));
            } else {
                args.push("-rc".to_string());
                args.push("vbr".to_string());
                args.push("-cq".to_string());
                args.push(crf.to_string());
            }
            let nvenc_preset = match config.preset.as_str() {
                "ultrafast" => "p1",
                "superfast" | "veryfast" => "p2",
                "faster" | "fast" => "p3",
                "medium" => "p4",
                "slow" => "p5",
                "slower" | "veryslow" => "p6",
                p if p.starts_with('p') => p,
                _ => "p4",
            };
            args.push("-preset".to_string());
            args.push(nvenc_preset.to_string());
            args.push("-spatial_aq".to_string());
            args.push("1".to_string());
            args.push("-temporal_aq".to_string());
            args.push("1".to_string());
            args.push("-bf".to_string());
            args.push(config.b_frames.to_string());
        }
        "h264_amf" | "hevc_amf" | "av1_amf" => {
            let amf_quality = match config.preset.as_str() {
                "ultrafast" | "superfast" | "veryfast" | "faster" | "fast" => "speed",
                "medium" => "balanced",
                _ => "quality",
            };
            args.push("-quality".to_string());
            args.push(amf_quality.to_string());
            if is_bitrate {
                args.push("-rc".to_string());
                args.push("cbr".to_string());
                args.push("-b:v".to_string());
                args.push(format!("{}k", config.average_bitrate_kbps));
            } else {
                args.push("-rc".to_string());
                args.push("cqp".to_string());
                args.push("-qp_p".to_string());
                args.push(crf.to_string());
                args.push("-qp_i".to_string());
                args.push(crf.to_string());
            }
        }
        "h264_qsv" | "hevc_qsv" | "av1_qsv" => {
            if is_bitrate {
                args.push("-b:v".to_string());
                args.push(format!("{}k", config.average_bitrate_kbps));
            } else {
                args.push("-global_quality".to_string());
                args.push(crf.to_string());
            }
            args.push("-preset".to_string());
            args.push(config.preset.clone());
        }
        "h264_vaapi" | "hevc_vaapi" => {
            let (compression_level, async_depth) = match config.preset.as_str() {
                "ultrafast" | "superfast" | "veryfast" => (1, 4),
                "faster" | "fast" | "medium" => (4, 4),
                _ => (7, 2),
            };
            args.push("-compression_level".to_string());
            args.push(compression_level.to_string());
            args.push("-async_depth".to_string());
            args.push(async_depth.to_string());
            if is_bitrate {
                args.push("-b:v".to_string());
                args.push(format!("{}k", config.average_bitrate_kbps));
            } else {
                args.push("-qp".to_string());
                args.push(crf.to_string());
            }
        }
        _ => {
            if is_bitrate {
                args.push("-b:v".to_string());
                args.push(format!("{}k", config.average_bitrate_kbps));
            } else {
                args.push("-crf".to_string());
                args.push(crf.to_string());
            }
        }
    }

    // Custom video arguments injection
    if let Some(custom) = &config.custom_video_args {
        for part in custom.split_whitespace() {
            if !part.trim().is_empty() {
                args.push(part.to_string());
            }
        }
    }

    // Audio Encoder Settings
    args.push("-c:a".to_string());
    match config.audio_codec.as_str() {
        "copy" => {
            args.push("copy".to_string());
        }
        "aac" => {
            args.push("aac".to_string());
            args.push("-b:a".to_string());
            args.push(format!("{}k", config.audio_bitrate_kbps));
        }
        "libopus" | "opus" => {
            args.push("libopus".to_string());
            args.push("-b:a".to_string());
            args.push(format!("{}k", config.audio_bitrate_kbps));
        }
        "flac" => {
            args.push("flac".to_string());
        }
        "mp3" | "libmp3lame" => {
            args.push("libmp3lame".to_string());
            args.push("-b:a".to_string());
            args.push(format!("{}k", config.audio_bitrate_kbps));
        }
        other => {
            args.push(other.to_string());
        }
    }

    // Container / Web streaming flags
    if config.faststart && (config.container == "mp4" || config.output_path.ends_with(".mp4") || config.output_path.ends_with(".m4v")) {
        args.push("-movflags".to_string());
        args.push("+faststart".to_string());
    }

    // Output file
    args.push(config.output_path.clone());

    Ok(args)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_filter_settings_and_subtitles() {
        let config = EncodeJobConfig {
            input_path: "/media/in.mkv".to_string(),
            output_path: "/media/out.mp4".to_string(),
            resolved_subtitle_path: Some("/media/test.ass".to_string()),
            filter_settings: FilterSettings {
                line_darkening_enabled: true,
                sharpness_enabled: true,
                ..Default::default()
            },
            ..EncodeJobConfig::default()
        };

        let args = build_ffmpeg_args(&config).unwrap();
        assert!(args.contains(&"-vf".to_string()));
        let vf_idx = args.iter().position(|r| r == "-vf").unwrap();
        let vf_val = &args[vf_idx + 1];
        assert!(vf_val.contains("subtitles="));
        assert!(vf_val.contains("curves="));
        assert!(vf_val.contains("unsharp="));
    }

    #[test]
    fn test_model_settings_interpolation_and_upscale() {
        let config = EncodeJobConfig {
            input_path: "/media/in.mkv".to_string(),
            output_path: "/media/out.mp4".to_string(),
            model_settings: ModelSettings {
                upscale_enabled: true,
                upscale_model: "Anime4K_Upscale_HD".to_string(),
                target_height: Some(1440),
                frame_gen_enabled: true,
                frame_gen_model: "SVP".to_string(),
                target_fps: 60,
                ..Default::default()
            },
            ..EncodeJobConfig::default()
        };

        let args = build_ffmpeg_args(&config).unwrap();
        assert!(args.contains(&"-vf".to_string()));
        let vf_idx = args.iter().position(|r| r == "-vf").unwrap();
        let vf_val = &args[vf_idx + 1];
        assert!(vf_val.contains("scale=-2:1440"));
        assert!(vf_val.contains("fps=fps=60"));
    }

    #[test]
    fn test_intro_concatenation_and_faststart() {
        let config = EncodeJobConfig {
            input_path: "/media/main.mkv".to_string(),
            output_path: "/media/final.mp4".to_string(),
            intro_enabled: true,
            intro_video_path: Some("/media/intro.mp4".to_string()),
            faststart: true,
            ..EncodeJobConfig::default()
        };

        let args = build_ffmpeg_args(&config).unwrap();
        assert!(args.contains(&"-filter_complex".to_string()));
        assert!(args.contains(&"-movflags".to_string()));
        assert!(args.contains(&"+faststart".to_string()));
        assert!(args.contains(&"-map".to_string()));
        assert!(args.contains(&"[v_out]".to_string()));
    }

    #[test]
    fn test_hardware_encoders_and_bitrate_mode() {
        let config = EncodeJobConfig {
            input_path: "/media/video.mp4".to_string(),
            output_path: "/media/encoded.mp4".to_string(),
            encoder: "h264_nvenc".to_string(),
            use_bitrate: true,
            average_bitrate_kbps: 6000,
            threads: 8,
            ..EncodeJobConfig::default()
        };

        let args = build_ffmpeg_args(&config).unwrap();
        assert!(args.contains(&"-threads".to_string()));
        assert!(args.contains(&"8".to_string()));
        assert!(args.contains(&"-c:v".to_string()));
        assert!(args.contains(&"h264_nvenc".to_string()));
        assert!(args.contains(&"-b:v".to_string()));
        assert!(args.contains(&"6000k".to_string()));
    }

    #[test]
    fn test_vaapi_arguments_and_hwupload() {
        let config = EncodeJobConfig {
            input_path: "/media/main.mkv".to_string(),
            output_path: "/media/final.mp4".to_string(),
            encoder: "hevc_vaapi".to_string(),
            preset: "ultrafast".to_string(),
            crf: 24,
            ..EncodeJobConfig::default()
        };

        let args = build_ffmpeg_args(&config).unwrap();
        assert!(args.contains(&"-vaapi_device".to_string()));
        assert!(args.contains(&"-c:v".to_string()));
        assert!(args.contains(&"hevc_vaapi".to_string()));
        assert!(args.contains(&"-compression_level".to_string()));
        assert!(args.contains(&"1".to_string()));
        assert!(args.contains(&"-async_depth".to_string()));
        assert!(args.contains(&"4".to_string()));
        assert!(args.contains(&"-qp".to_string()));
        assert!(args.contains(&"24".to_string()));
        assert!(args.contains(&"-pix_fmt".to_string()));
        assert!(args.contains(&"vaapi".to_string()));
        let vf_idx = args.iter().position(|r| r == "-vf").unwrap();
        let vf_val = &args[vf_idx + 1];
        assert!(vf_val.contains("format=nv12,hwupload"));
    }

    #[test]
    fn test_windows_path_escaping_and_fontsdir() {
        let win_sub = r"C:\Users\Berk\AppData\Local\Temp\florasubs_job_sub.ass";
        let win_fonts = r"C:\Users\Berk\AppData\Local\Temp\florasubs_job_fonts";
        let filter = build_subtitles_filter(win_sub, Some(win_fonts));
        assert_eq!(
            filter,
            "subtitles='C\\:/Users/Berk/AppData/Local/Temp/florasubs_job_sub.ass':fontsdir='C\\:/Users/Berk/AppData/Local/Temp/florasubs_job_fonts':alpha=1"
        );
    }

    #[test]
    fn test_upscale_and_hardsub_pipeline_ordering() {
        let config = EncodeJobConfig {
            input_path: "/media/anime_raw.mkv".to_string(),
            output_path: "/media/anime_upscaled.mp4".to_string(),
            model_settings: ModelSettings {
                upscale_enabled: true,
                target_height: Some(1440),
                ..Default::default()
            },
            hardsub_enabled: true,
            resolved_subtitle_path: Some("/tmp/sub.ass".to_string()),
            fonts_dir: Some("/tmp/fonts".to_string()),
            ..EncodeJobConfig::default()
        };

        let args = build_ffmpeg_args(&config).unwrap();
        let vf_idx = args.iter().position(|r| r == "-vf").expect("Must contain -vf");
        let vf_str = &args[vf_idx + 1];

        let scale_pos = vf_str.find("scale=-2:1440").expect("Must contain scale");
        let sub_pos = vf_str.find("subtitles=").expect("Must contain subtitles");
        assert!(scale_pos < sub_pos, "Scale/Upscale filter must precede subtitle burning");
        assert!(vf_str.contains("fontsdir='/tmp/fonts'"));
    }

    #[test]
    fn test_preset_profiles_flags_spec() {
        let profiles = get_preset_profiles();
        let x264_prof = profiles.iter().find(|p| p.id == "anime_web_x264").unwrap();
        assert_eq!(x264_prof.encoder, "libx264");
        assert_eq!(x264_prof.crf, 20);
        assert_eq!(x264_prof.preset, "slow");
        assert_eq!(x264_prof.pixel_format, "yuv420p");
        assert!(x264_prof.faststart);

        let av1_prof = profiles.iter().find(|p| p.id == "anime_nextgen_av1").unwrap();
        assert_eq!(av1_prof.encoder, "libsvtav1");
        assert_eq!(av1_prof.crf, 24);
        assert_eq!(av1_prof.preset, "6");
        assert_eq!(av1_prof.pixel_format, "yuv420p10le");
        assert!(av1_prof.faststart);

        let nvenc_prof = profiles.iter().find(|p| p.id == "gpu_nvidia_fast").unwrap();
        assert_eq!(nvenc_prof.encoder, "hevc_nvenc");
        assert_eq!(nvenc_prof.crf, 22);
        assert_eq!(nvenc_prof.preset, "p6");

        let amf_prof = profiles.iter().find(|p| p.id == "gpu_amd_fast").unwrap();
        assert_eq!(amf_prof.encoder, "hevc_amf");
        assert_eq!(amf_prof.crf, 22);
        assert_eq!(amf_prof.preset, "quality");
    }

    #[test]
    fn test_escape_special_characters() {
        let complex_path = r"/media/Anime [2026]; Vol, 1's Special/sub:title.ass";
        let escaped = escape_ffmpeg_filter_path(complex_path);
        assert_eq!(escaped, r"/media/Anime \[2026\]\; Vol\, 1'\''s Special/sub\:title.ass");
    }

    #[test]
    fn test_threads_clamping_to_16() {
        let mut config = EncodeJobConfig {
            input_path: "/media/in.mkv".to_string(),
            output_path: "/media/out.mp4".to_string(),
            threads: 32, // Should be clamped to 16
            ..EncodeJobConfig::default()
        };

        let args = build_ffmpeg_args(&config).unwrap();
        let threads_idx = args.iter().position(|r| r == "-threads").expect("Must contain -threads");
        assert_eq!(args[threads_idx + 1], "16", "Threads > 16 must be clamped to 16");

        config.threads = 8;
        let args2 = build_ffmpeg_args(&config).unwrap();
        let threads_idx2 = args2.iter().position(|r| r == "-threads").expect("Must contain -threads");
        assert_eq!(args2[threads_idx2 + 1], "8", "Threads <= 16 must be preserved");
    }

    #[test]
    fn test_upscale_lanczos_accurate_rnd_flags() {
        let mut config = EncodeJobConfig {
            input_path: "/media/in.mkv".to_string(),
            output_path: "/media/out.mp4".to_string(),
            model_settings: ModelSettings {
                upscale_enabled: true,
                ..Default::default()
            },
            ..EncodeJobConfig::default()
        };

        // 2K (1440p)
        config.model_settings.target_height = Some(1440);
        let args = build_ffmpeg_args(&config).unwrap();
        let vf_idx = args.iter().position(|r| r == "-vf").unwrap();
        assert!(args[vf_idx + 1].contains("scale=-2:1440:flags=lanczos+accurate_rnd"));

        // 4K (2160p)
        config.model_settings.target_height = Some(2160);
        let args_4k = build_ffmpeg_args(&config).unwrap();
        let vf_idx_4k = args_4k.iter().position(|r| r == "-vf").unwrap();
        assert!(args_4k[vf_idx_4k + 1].contains("scale=-2:2160:flags=lanczos+accurate_rnd"));

        // 4x Model
        config.model_settings.target_height = None;
        config.model_settings.upscale_model = "4x-RealESRGAN-AnimeVideoV3-Compact".to_string();
        let args_4x = build_ffmpeg_args(&config).unwrap();
        let vf_idx_4x = args_4x.iter().position(|r| r == "-vf").unwrap();
        assert!(args_4x[vf_idx_4x + 1].contains("scale=iw*4:ih*4:flags=lanczos+accurate_rnd"));

        // 2x Model default
        config.model_settings.upscale_model = "2x_AnimeJaNai_HD_V3_Compact".to_string();
        let args_2x = build_ffmpeg_args(&config).unwrap();
        let vf_idx_2x = args_2x.iter().position(|r| r == "-vf").unwrap();
        assert!(args_2x[vf_idx_2x + 1].contains("scale=iw*2:ih*2:flags=lanczos+accurate_rnd"));
    }

    #[test]
    fn test_encoder_and_filter_thread_controls() {
        let mut config = EncodeJobConfig {
            input_path: "/media/in.mkv".to_string(),
            output_path: "/media/out.mp4".to_string(),
            encoder: "libx264".to_string(),
            threads: 24,
            ..EncodeJobConfig::default()
        };

        let args = build_ffmpeg_args(&config).unwrap();
        assert!(args.contains(&"-filter_threads".to_string()));
        assert!(args.contains(&"24".to_string()));
        assert!(args.contains(&"-threads:v".to_string()));
        assert!(args.contains(&"-x264-params".to_string()));
        assert!(args.contains(&"threads=24".to_string()));

        // x265 pools check
        config.encoder = "libx265".to_string();
        let args_265 = build_ffmpeg_args(&config).unwrap();
        assert!(args_265.contains(&"-x265-params".to_string()));
        let x265_idx = args_265.iter().position(|r| r == "-x265-params").unwrap();
        assert!(args_265[x265_idx + 1].contains("pools=24"));
        assert!(args_265[x265_idx + 1].contains("no-sao=1"));
        // svtav1 lp check
        config.encoder = "libsvtav1".to_string();
        let args_av1 = build_ffmpeg_args(&config).unwrap();
        assert!(args_av1.contains(&"-svtav1-params".to_string()));
        let svt_idx = args_av1.iter().position(|r| r == "-svtav1-params").unwrap();
        assert!(args_av1[svt_idx + 1].contains("lp=24"));
    }
}
