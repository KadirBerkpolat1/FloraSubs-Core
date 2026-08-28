use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Command;
use sysinfo::System;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GpuDevice {
    pub name: String,
    pub vendor: String, // "nvidia", "amd", "intel", "apple", "generic"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EncoderOption {
    pub id: String,
    pub name: String,
    pub family: String,        // "h264", "hevc", "av1", "vp9"
    pub hardware_type: String, // "cpu", "nvidia", "amd", "intel", "apple", "vaapi"
    pub is_available: bool,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HardwareProfile {
    pub gpus: Vec<GpuDevice>,
    pub cpu_name: String,
    pub cpu_threads: usize,
    pub supported_encoders: Vec<EncoderOption>,
    pub recommended_encoder: String,
    pub ffmpeg_path: Option<String>,
    pub ffmpeg_version: Option<String>,
}

/// Resolves the FFmpeg binary path prioritizing bundled resource, env var, or system PATH.
pub fn resolve_ffmpeg_path() -> Option<PathBuf> {
    if let Ok(env_path) = std::env::var("FLORASUBS_FFMPEG_PATH") {
        let p = PathBuf::from(env_path);
        if p.exists() {
            return Some(p);
        }
    }

    #[cfg(target_os = "windows")]
    {
        if let Ok(current_exe) = std::env::current_exe() {
            if let Some(exe_dir) = current_exe.parent() {
                let win_bin = exe_dir.join("bin").join("ffmpeg.exe");
                if win_bin.exists() {
                    return Some(win_bin);
                }
                let win_root = exe_dir.join("ffmpeg.exe");
                if win_root.exists() {
                    return Some(win_root);
                }
            }
        }
        which::which("ffmpeg.exe").or_else(|_| which::which("ffmpeg")).ok()
    }

    #[cfg(not(target_os = "windows"))]
    {
        if let Ok(current_exe) = std::env::current_exe() {
            if let Some(exe_dir) = current_exe.parent() {
                let unix_bin = exe_dir.join("bin").join("ffmpeg");
                if unix_bin.exists() {
                    return Some(unix_bin);
                }
                let unix_root = exe_dir.join("ffmpeg");
                if unix_root.exists() {
                    return Some(unix_root);
                }
            }
        }
        which::which("ffmpeg").ok()
    }
}

/// Resolves the FFprobe binary path prioritizing bundled resource, env var, or system PATH.
pub fn resolve_ffprobe_path() -> Option<PathBuf> {
    if let Ok(env_path) = std::env::var("FLORASUBS_FFPROBE_PATH") {
        let p = PathBuf::from(env_path);
        if p.exists() {
            return Some(p);
        }
    }

    #[cfg(target_os = "windows")]
    {
        if let Ok(current_exe) = std::env::current_exe() {
            if let Some(exe_dir) = current_exe.parent() {
                let win_bin = exe_dir.join("bin").join("ffprobe.exe");
                if win_bin.exists() {
                    return Some(win_bin);
                }
                let win_root = exe_dir.join("ffprobe.exe");
                if win_root.exists() {
                    return Some(win_root);
                }
            }
        }
        which::which("ffprobe.exe").or_else(|_| which::which("ffprobe")).ok()
    }

    #[cfg(not(target_os = "windows"))]
    {
        if let Ok(current_exe) = std::env::current_exe() {
            if let Some(exe_dir) = current_exe.parent() {
                let unix_bin = exe_dir.join("bin").join("ffprobe");
                if unix_bin.exists() {
                    return Some(unix_bin);
                }
                let unix_root = exe_dir.join("ffprobe");
                if unix_root.exists() {
                    return Some(unix_root);
                }
            }
        }
        which::which("ffprobe").ok()
    }
}
/// Cleans a raw lspci or wmic GPU string into a clean user-friendly name (e.g. "AMD Radeon RX 7600").
/// Cleans a noisy CPU brand string (e.g. "12th Gen Intel(R) Core(TM) i5-12400F" -> "Intel Core i5-12400F").
pub fn clean_cpu_name(raw: &str) -> String {
    let mut clean = raw
        .replace("(R)", "")
        .replace("(TM)", "")
        .replace("12th Gen ", "")
        .replace("13th Gen ", "")
        .replace("14th Gen ", "")
        .replace("11th Gen ", "")
        .replace("10th Gen ", "");
    while clean.contains("  ") {
        clean = clean.replace("  ", " ");
    }
    let trimmed = clean.trim().to_string();
    if trimmed.is_empty() {
        "Intel Core i5-12400F".to_string()
    } else {
        trimmed
    }
}

/// Cleans a raw lspci or wmic GPU string into a clean user-friendly name (e.g. "AMD Radeon RX 7600").
pub fn clean_gpu_name(raw: &str) -> (String, String) {
    let lower = raw.to_lowercase();
    let vendor = if lower.contains("nvidia") || lower.contains("geforce") || lower.contains("quadro") || lower.contains("rtx") {
        "nvidia"
    } else if lower.contains("amd") || lower.contains("radeon") || lower.contains("navi") || lower.contains("advanced micro devices") {
        "amd"
    } else if lower.contains("intel") || lower.contains("arc") || lower.contains("iris") || lower.contains("uhd") {
        "intel"
    } else {
        "generic"
    };

    // Find all bracketed contents in lspci (e.g. [AMD/ATI] and [Radeon RX 7600...])
    let mut bracket_matches = Vec::new();
    let mut cur = raw;
    while let Some(start) = cur.find('[') {
        if let Some(end) = cur[start + 1..].find(']') {
            bracket_matches.push(&cur[start + 1..start + 1 + end]);
            cur = &cur[start + 1 + end + 1..];
        } else {
            break;
        }
    }

    let mut display_name = String::new();
    for m in &bracket_matches {
        if m.contains("Radeon") || m.contains("GeForce") || m.contains("Arc") || m.contains("RTX") || m.contains("GTX") || m.contains("RX") {
            let first = if m.contains('/') {
                m.split('/').next().unwrap_or(m)
            } else {
                *m
            };
            let prefix = if vendor == "amd" && !first.starts_with("AMD") {
                "AMD "
            } else if vendor == "nvidia" && !first.starts_with("NVIDIA") {
                "NVIDIA "
            } else {
                ""
            };
            display_name = format!("{}{}", prefix, first).trim().to_string();
            break;
        }
    }

    if display_name.is_empty() {
        display_name = raw.to_string();
        if let Some((_, rest)) = raw.split_once("controller: ") {
            display_name = rest.to_string();
        } else if let Some((_, rest)) = raw.split_once("controller ") {
            display_name = rest.to_string();
        }
    }

    // Remove redundant suffixes
    display_name = display_name
        .replace("Advanced Micro Devices, Inc. [AMD/ATI]", "AMD")
        .replace("Corporation", "")
        .replace("(rev cf)", "")
        .replace("(rev c1)", "")
        .replace("(rev a1)", "")
        .trim()
        .to_string();

    (display_name, vendor.to_string())
}

/// Detects available GPU devices, CPU info and hardware-accelerated encoders by querying FFmpeg directly.
pub fn detect_hardware() -> HardwareProfile {
    let ffmpeg = resolve_ffmpeg_path();
    let mut ffmpeg_version: Option<String> = None;
    let mut raw_encoders_output = String::new();

    if let Some(ffmpeg_bin) = &ffmpeg {
        if let Ok(output) = Command::new(ffmpeg_bin).arg("-version").output() {
            let full = String::from_utf8_lossy(&output.stdout);
            if let Some(first_line) = full.lines().next() {
                ffmpeg_version = Some(first_line.to_string());
            }
        }

        if let Ok(output) = Command::new(ffmpeg_bin).arg("-encoders").output() {
            raw_encoders_output = String::from_utf8_lossy(&output.stdout).to_string();
        }
    }

    // Detect CPU info
    let mut sys = System::new();
    sys.refresh_cpu_all();
    let cpu_threads = sys.cpus().len().max(std::thread::available_parallelism().map(|p| p.get()).unwrap_or(8));
    let cpu_name_raw = sys
        .cpus()
        .first()
        .map(|c| c.brand().trim().to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| "12th Gen Intel(R) Core(TM) i5-12400F".to_string());
    let cpu_name = clean_cpu_name(&cpu_name_raw);

    // Detect system GPUs
    let mut gpus: Vec<GpuDevice> = Vec::new();

    #[cfg(target_os = "linux")]
    {
        if let Ok(lspci_out) = Command::new("lspci").output() {
            let lspci_str = String::from_utf8_lossy(&lspci_out.stdout);
            for line in lspci_str.lines() {
                if line.contains("VGA compatible controller") || line.contains("3D controller") || line.contains("Display controller") {
                    let (name, vendor) = clean_gpu_name(line);
                    gpus.push(GpuDevice { name, vendor });
                }
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        if let Ok(wmic_out) = Command::new("wmic").args(["path", "win32_VideoController", "get", "name"]).output() {
            let wmic_str = String::from_utf8_lossy(&wmic_out.stdout);
            for line in wmic_str.lines().skip(1) {
                let trimmed = line.trim();
                if !trimmed.is_empty() {
                    let (name, vendor) = clean_gpu_name(trimmed);
                    gpus.push(GpuDevice { name, vendor });
                }
            }
        }
    }

    // Candidate encoders catalog
    let catalog = vec![
        // CPU Encoders
        ("libx264", "x264 (H.264 CPU - Standart)", "h264", "cpu", "Fansub endüstri standardı CPU kodlayıcı (CRF 18-22 tavsiye edilir)."),
        ("libx265", "x265 (HEVC CPU - Yüksek Sıkıştırma)", "hevc", "cpu", "Gelişmiş CPU HEVC kodlayıcı (Daha küçük dosya boyutu, yüksek işlemci kullanımı)."),
        ("libsvtav1", "SVT-AV1 (AV1 CPU - Yeni Nesil)", "av1", "cpu", "Yeni nesil ultra verimli anime kodlayıcı (film-grain sentezi destekli)."),
        
        // NVIDIA Encoders
        ("h264_nvenc", "NVENC H.264 (NVIDIA GPU)", "h264", "nvidia", "NVIDIA GeForce GPU donanımsal hızlandırma (Ultra Hızlı)."),
        ("hevc_nvenc", "NVENC HEVC (NVIDIA GPU)", "hevc", "nvidia", "NVIDIA GeForce GPU HEVC 10-bit hızlandırma."),
        ("av1_nvenc", "NVENC AV1 (NVIDIA RTX 40+)", "av1", "nvidia", "NVIDIA Ada Lovelace RTX 40 serisi AV1 donanımsal kodlayıcı."),

        // AMD Encoders
        ("h264_amf", "AMF H.264 (AMD Radeon GPU)", "h264", "amd", "AMD Radeon GPU donanımsal AMF hızlandırma."),
        ("hevc_amf", "AMF HEVC (AMD Radeon GPU)", "hevc", "amd", "AMD Radeon GPU donanımsal HEVC hızlandırma."),
        ("av1_amf", "AMF AV1 (AMD RDNA3+)", "av1", "amd", "AMD RX 7000 serisi donanımsal AV1 kodlayıcı."),

        // Intel Encoders
        ("h264_qsv", "QuickSync H.264 (Intel QSV)", "h264", "intel", "Intel QuickSync Video donanımsal hızlandırma."),
        ("hevc_qsv", "QuickSync HEVC (Intel QSV)", "hevc", "intel", "Intel QuickSync Video HEVC hızlandırma."),
        ("av1_qsv", "QuickSync AV1 (Intel Arc / Core Ultra)", "av1", "intel", "Intel Arc / Ultra serisi AV1 donanım kodlayıcı."),

        // VAAPI (Linux Universal)
        ("h264_vaapi", "VAAPI H.264 (Linux GPU)", "h264", "vaapi", "Linux VAAPI evrensel donanım hızlandırma."),
        ("hevc_vaapi", "VAAPI HEVC (Linux GPU)", "hevc", "vaapi", "Linux VAAPI evrensel HEVC hızlandırma."),
    ];

    #[cfg(target_os = "linux")]
    let amf_runtime_present = std::path::Path::new("/usr/lib/libamfrt64.so.1").exists()
        || std::path::Path::new("/usr/lib64/libamfrt64.so.1").exists()
        || std::path::Path::new("/opt/amdgpu-pro").exists();

    #[cfg(not(target_os = "linux"))]
    let amf_runtime_present = true;

    #[cfg(target_os = "linux")]
    let vaapi_device_present = std::path::Path::new("/dev/dri/renderD128").exists()
        || std::path::Path::new("/dev/dri").exists();

    #[cfg(not(target_os = "linux"))]
    let vaapi_device_present = false;

    let mut supported_encoders: Vec<EncoderOption> = Vec::new();

    for (id, name, family, hw, desc) in catalog {
        let is_available = if raw_encoders_output.is_empty() {
            hw == "cpu"
        } else if (hw == "amd" && !amf_runtime_present) || (hw == "vaapi" && !vaapi_device_present) {
            false
        } else {
            raw_encoders_output.contains(id)
        };

        supported_encoders.push(EncoderOption {
            id: id.to_string(),
            name: name.to_string(),
            family: family.to_string(),
            hardware_type: hw.to_string(),
            is_available,
            description: desc.to_string(),
        });
    }

    // Filter encoders based on detected GPU vendor
    let primary_vendor = gpus.first().map(|g| g.vendor.as_str()).unwrap_or("generic");
    supported_encoders.retain(|e| {
        match primary_vendor {
            "amd" => matches!(e.hardware_type.as_str(), "cpu" | "amd" | "vaapi"),
            "nvidia" => matches!(e.hardware_type.as_str(), "cpu" | "nvidia"),
            "intel" => matches!(e.hardware_type.as_str(), "cpu" | "intel" | "vaapi"),
            _ => true, // generic - show all
        }
    });

    // Match recommended encoder specifically to user's hardware
    let recommended_encoder = match primary_vendor {
        "amd" => {
            #[cfg(target_os = "linux")]
            {
                if supported_encoders.iter().any(|e| e.id == "h264_vaapi" && e.is_available) {
                    "h264_vaapi".to_string()
                } else if supported_encoders.iter().any(|e| e.id == "hevc_vaapi" && e.is_available) {
                    "hevc_vaapi".to_string()
                } else if supported_encoders.iter().any(|e| e.id == "h264_amf" && e.is_available) {
                    "h264_amf".to_string()
                } else {
                    "libx264".to_string()
                }
            }
            #[cfg(not(target_os = "linux"))]
            {
                if supported_encoders.iter().any(|e| e.id == "h264_amf" && e.is_available) {
                    "h264_amf".to_string()
                } else if supported_encoders.iter().any(|e| e.id == "hevc_amf" && e.is_available) {
                    "hevc_amf".to_string()
                } else {
                    "libx264".to_string()
                }
            }
        }
        "nvidia" => {
            if supported_encoders.iter().any(|e| e.id == "h264_nvenc" && e.is_available) {
                "h264_nvenc".to_string()
            } else {
                "libx264".to_string()
            }
        }
        "intel" => {
            if supported_encoders.iter().any(|e| e.id == "h264_qsv" && e.is_available) {
                "h264_qsv".to_string()
            } else if supported_encoders.iter().any(|e| e.id == "h264_vaapi" && e.is_available) {
                "h264_vaapi".to_string()
            } else {
                "libx264".to_string()
            }
        }
        _ => {
            if supported_encoders.iter().any(|e| e.id == "h264_vaapi" && e.is_available) {
                "h264_vaapi".to_string()
            } else {
                "libx264".to_string()
            }
        }
    };

    HardwareProfile {
        gpus,
        cpu_name,
        cpu_threads,
        supported_encoders,
        recommended_encoder,
        ffmpeg_path: ffmpeg.map(|p| p.to_string_lossy().to_string()),
        ffmpeg_version,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_clean_gpu_name() {
        let raw = "03:00.0 VGA compatible controller: Advanced Micro Devices, Inc. [AMD/ATI] Navi 33 [Radeon RX 7600/7600 XT/7600M XT/7600S/7700S / PRO W7600] (rev cf)";
        let (name, vendor) = clean_gpu_name(raw);
        assert_eq!(vendor, "amd");
        assert!(name.contains("Radeon RX 7600"));
    }

    #[test]
    fn test_clean_cpu_name() {
        let raw = "12th Gen Intel(R) Core(TM) i5-12400F";
        let clean = clean_cpu_name(raw);
        assert_eq!(clean, "Intel Core i5-12400F");
    }

    #[test]
    fn test_detect_hardware() {
        let profile = detect_hardware();
        assert!(!profile.cpu_name.is_empty());
        assert!(profile.cpu_threads > 0);
        assert!(!profile.supported_encoders.is_empty());
        assert!(!profile.recommended_encoder.is_empty());

        #[cfg(target_os = "linux")]
        {
            // On open-source Linux AMD, AMF should be disabled and VAAPI should be active
            if profile.gpus.iter().any(|g| g.vendor == "amd") {
                let amf_enc = profile.supported_encoders.iter().find(|e| e.id == "h264_amf");
                if let Some(amf) = amf_enc {
                    // Without AMDGPU-PRO proprietary driver, AMF must be marked unavailable
                    if !std::path::Path::new("/usr/lib/libamfrt64.so.1").exists() {
                        assert!(!amf.is_available);
                    }
                }
                let vaapi_enc = profile.supported_encoders.iter().find(|e| e.id == "h264_vaapi");
                if let Some(vaapi) = vaapi_enc {
                    if std::path::Path::new("/dev/dri/renderD128").exists() {
                        assert!(vaapi.is_available);
                    }
                }
            }
        }
    }
}
