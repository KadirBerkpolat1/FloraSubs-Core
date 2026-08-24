use std::path::Path;
use std::process::Command;
use crate::engine::gpu_probe::resolve_ffmpeg_path;
use crate::engine::probe::probe_media_file;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ExtractedTrackResult {
    pub stream_index: usize,
    pub subtitle_index: usize,
    pub language: String,
    pub title: String,
    pub output_path: String,
    pub format: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ExtractedFontsResult {
    pub temp_dir: String,
    pub font_files: Vec<String>,
    pub count: usize,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SubtitleDialogue {
    pub start: f64,
    pub end: f64,
    pub text: String,
    pub raw_text: String,
    pub style: String,
}

pub fn parse_ass_time(s: &str) -> f64 {
    let parts: Vec<&str> = s.trim().split(':').collect();
    if parts.len() == 3 {
        let h: f64 = parts[0].parse().unwrap_or(0.0);
        let m: f64 = parts[1].parse().unwrap_or(0.0);
        let sec: f64 = parts[2].parse().unwrap_or(0.0);
        h * 3600.0 + m * 60.0 + sec
    } else {
        s.trim().parse().unwrap_or(0.0)
    }
}

pub fn clean_ass_text(raw: &str) -> String {
    let mut text = raw.to_string();
    if let Ok(re) = regex::Regex::new(r"\{[^}]*\}") {
        text = re.replace_all(&text, "").to_string();
    }
    text = text.replace("\\N", "\n").replace("\\n", "\n").replace("\\h", " ");
    text.trim().to_string()
}

pub fn parse_ass_content(content: &str) -> Vec<SubtitleDialogue> {
    let mut dialogues = Vec::new();
    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("Dialogue:") {
            if let Some((_, rest)) = trimmed.split_once(':') {
                let parts: Vec<&str> = rest.splitn(10, ',').collect();
                if parts.len() >= 10 {
                    let start = parse_ass_time(parts[1]);
                    let end = parse_ass_time(parts[2]);
                    let style = parts[3].trim().to_string();
                    let raw_text = parts[9].trim().to_string();
                    let text = clean_ass_text(&raw_text);

                    if !text.is_empty() && end >= start {
                        dialogues.push(SubtitleDialogue {
                            start,
                            end,
                            text,
                            raw_text,
                            style,
                        });
                    }
                }
            }
        }
    }
    dialogues.sort_by(|a, b| a.start.partial_cmp(&b.start).unwrap_or(std::cmp::Ordering::Equal));
    dialogues
}

/// Extracts a specific subtitle track from an MKV/MP4 file and returns parsed dialogue cues.
pub fn extract_and_parse_subtitles(
    input_path: &str,
    subtitle_index: usize,
    is_external: bool,
) -> Result<Vec<SubtitleDialogue>, String> {
    if is_external {
        let content = std::fs::read_to_string(input_path)
            .map_err(|e| format!("Altyazı dosyası okunamadı: {}", e))?;
        return Ok(parse_ass_content(&content));
    }

    let temp_sub = std::env::temp_dir().join(format!("florasubs_preview_{}.ass", subtitle_index));
    extract_subtitle_track(input_path, subtitle_index, &temp_sub)?;

    let content = std::fs::read_to_string(&temp_sub)
        .map_err(|e| format!("Çıkarılan altyazı okunamadı: {}", e))?;
    let _ = std::fs::remove_file(&temp_sub);

    Ok(parse_ass_content(&content))
}

/// Extracts a specific subtitle track from an MKV/MP4 file to an ASS/SRT file.
pub fn extract_subtitle_track<P: AsRef<Path>, O: AsRef<Path>>(
    input_path: P,
    subtitle_index: usize,
    output_path: O,
) -> Result<String, String> {
    let input = input_path.as_ref();
    let output = output_path.as_ref();

    if !input.exists() {
        return Err(format!("Girdi dosyası bulunamadı: {}", input.display()));
    }

    if let Some(parent) = output.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Çıktı klasörü oluşturulamadı: {}", e))?;
    }

    let ffmpeg_bin = resolve_ffmpeg_path()
        .ok_or_else(|| "ffmpeg ikili dosyası bulunamadı.".to_string())?;

    let map_arg = format!("0:s:{}", subtitle_index);
    let output_res = Command::new(&ffmpeg_bin)
        .arg("-y")
        .arg("-i")
        .arg(input)
        .args(["-map", &map_arg])
        .args(["-c:s", "copy"])
        .arg(output)
        .output()
        .map_err(|e| format!("FFmpeg altyazı çıkarma komutu çalıştırılamadı: {}", e))?;

    if !output_res.status.success() {
        // Retry with transcoding if copy fails (e.g. converting mov_text/subrip to ass)
        let retry_res = Command::new(&ffmpeg_bin)
            .arg("-y")
            .arg("-i")
            .arg(input)
            .args(["-map", &map_arg])
            .arg(output)
            .output()
            .map_err(|e| format!("FFmpeg altyazı dönüştürme hatası: {}", e))?;

        if !retry_res.status.success() {
            let err = String::from_utf8_lossy(&retry_res.stderr);
            return Err(format!("Altyazı çıkarılamadı: {}", err));
        }
    }

    Ok(output.to_string_lossy().to_string())
}

/// Extracts all subtitle tracks from the media file into an output folder.
pub fn extract_all_subtitles<P: AsRef<Path>, O: AsRef<Path>>(
    input_path: P,
    output_dir: O,
) -> Result<Vec<ExtractedTrackResult>, String> {
    let input = input_path.as_ref();
    let out_dir = output_dir.as_ref();

    let meta = probe_media_file(input)?;
    if meta.subtitle_streams.is_empty() {
        return Err("Dosyada altyazı akışı bulunamadı.".to_string());
    }

    std::fs::create_dir_all(out_dir)
        .map_err(|e| format!("Hedef klasör oluşturulamadı: {}", e))?;

    let base_stem = input
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| "subtitle".to_string());

    let mut results = Vec::new();

    for sub in &meta.subtitle_streams {
        let lang = if sub.language.is_empty() || sub.language == "und" {
            format!("track{}", sub.subtitle_index)
        } else {
            sub.language.clone()
        };

        let ext = if sub.codec.contains("ass") || sub.codec.contains("ssa") {
            "ass"
        } else if sub.codec.contains("subrip") || sub.codec.contains("srt") {
            "srt"
        } else {
            "ass"
        };

        let filename = format!("{}_{}_{}.{}", base_stem, sub.subtitle_index, lang, ext);
        let out_file = out_dir.join(filename);

        extract_subtitle_track(input, sub.subtitle_index, &out_file)?;

        results.push(ExtractedTrackResult {
            stream_index: sub.index,
            subtitle_index: sub.subtitle_index,
            language: sub.language.clone(),
            title: sub.title.clone(),
            output_path: out_file.to_string_lossy().to_string(),
            format: ext.to_string(),
        });
    }

    Ok(results)
}

/// Extracts all embedded font attachments from an MKV file to a target directory.
pub fn extract_embedded_fonts<P: AsRef<Path>, O: AsRef<Path>>(
    input_path: P,
    target_dir: O,
) -> Result<ExtractedFontsResult, String> {
    let input = input_path.as_ref();
    let target = target_dir.as_ref();

    if !input.exists() {
        return Err(format!("Girdi dosyası bulunamadı: {}", input.display()));
    }

    std::fs::create_dir_all(target)
        .map_err(|e| format!("Font klasörü oluşturulamadı: {}", e))?;

    let ffmpeg_bin = resolve_ffmpeg_path()
        .ok_or_else(|| "ffmpeg ikili dosyası bulunamadı.".to_string())?;

    let output_res = Command::new(&ffmpeg_bin)
        .current_dir(target)
        .arg("-y")
        .args(["-dump_attachment:t", ""])
        .arg("-i")
        .arg(input)
        .output()
        .map_err(|e| format!("Font çıkarma komutu çalıştırılamadı: {}", e))?;

    let _ = output_res;

    let mut font_files = Vec::new();
    if let Ok(entries) = std::fs::read_dir(target) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                    let ext_lower = ext.to_lowercase();
                    if ext_lower == "ttf" || ext_lower == "otf" || ext_lower == "ttc" || ext_lower == "woff" {
                        font_files.push(path.to_string_lossy().to_string());
                    }
                }
            }
        }
    }

    let count = font_files.len();
    Ok(ExtractedFontsResult {
        temp_dir: target.to_string_lossy().to_string(),
        font_files,
        count,
    })
}

/// Creates a temporary font extraction directory for a job and dumps MKV attachments.
pub fn prepare_job_fonts_dir<P: AsRef<Path>>(
    input_path: P,
    job_id: &str,
) -> Result<Option<ExtractedFontsResult>, String> {
    let temp_root = std::env::temp_dir().join(format!("florasubs_fonts_{}", job_id));
    let result = extract_embedded_fonts(input_path, &temp_root)?;
    if result.count > 0 {
        Ok(Some(result))
    } else {
        let _ = std::fs::remove_dir_all(&temp_root);
        Ok(None)
    }
}

/// Cleans up temporary fonts directory.
pub fn cleanup_fonts_dir<P: AsRef<Path>>(dir_path: P) {
    let p = dir_path.as_ref();
    if p.exists() {
        let _ = std::fs::remove_dir_all(p);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_ass_dialogues() {
        let sample_ass = r#"[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.50,0:00:04.20,Default,,0,0,0,,{\pos(100,200)}Merhaba Fansub Dünyası!\N[FloraSubs]
Dialogue: 0,0:00:05.00,0:00:08.50,Default,,0,0,0,,İkinci altyazı satırı.
"#;
        let dialogues = parse_ass_content(sample_ass);
        assert_eq!(dialogues.len(), 2);
        assert_eq!(dialogues[0].start, 1.5);
        assert_eq!(dialogues[0].end, 4.2);
        assert_eq!(dialogues[0].text, "Merhaba Fansub Dünyası!\n[FloraSubs]");
        assert_eq!(dialogues[1].start, 5.0);
        assert_eq!(dialogues[1].end, 8.5);
        assert_eq!(dialogues[1].text, "İkinci altyazı satırı.");
    }
}
