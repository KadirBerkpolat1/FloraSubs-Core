use std::net::SocketAddr;
use std::path::Path;
use std::time::Duration;
use tokio::io::{AsyncReadExt, AsyncSeekExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};
use tokio::process::Command;

use crate::engine::gpu_probe::resolve_ffmpeg_path;
use crate::engine::probe::normalize_file_path;

#[derive(Debug, Clone)]
pub struct MediaStreamerServer {
    pub port: u16,
    pub auth_token: String,
}

impl MediaStreamerServer {
    /// Starts the local embedded HTTP streaming server on an ephemeral port (127.0.0.1:0).
    pub async fn start() -> Result<Self, String> {
        let listener = TcpListener::bind("127.0.0.1:0")
            .await
            .map_err(|e| format!("Yerel akış sunucusu başlatılamadı: {}", e))?;

        let addr = listener
            .local_addr()
            .map_err(|e| format!("Soket adresi alınamadı: {}", e))?;
        let port = addr.port();
        let auth_token = uuid::Uuid::new_v4().to_string();

        // Spawn background connection handler loop
        let server_token = auth_token.clone();
        tokio::spawn(async move {
            loop {
                if let Ok((stream, client_addr)) = listener.accept().await {
                    let conn_token = server_token.clone();
                    tokio::spawn(async move {
                        let _ = handle_client_connection(stream, client_addr, conn_token).await;
                    });
                }
            }
        });

        Ok(Self { port, auth_token })
    }

    /// Returns the local HTTP stream URL for a given file path.
    pub fn get_stream_url(&self, file_path: &str) -> String {
        let clean = normalize_file_path(file_path);
        let encoded: String = urlencoding::encode(&clean).into_owned();
        format!(
            "http://127.0.0.1:{}/stream?path={}&token={}",
            self.port, encoded, self.auth_token
        )
    }

    /// Returns the local WebVTT subtitle stream URL for a given file and track index.
    pub fn get_subtitle_url(&self, file_path: &str, track_index: usize) -> String {
        let clean = normalize_file_path(file_path);
        let encoded: String = urlencoding::encode(&clean).into_owned();
        format!(
            "http://127.0.0.1:{}/subtitle?path={}&track={}&token={}",
            self.port, encoded, track_index, self.auth_token
        )
    }
}

async fn handle_client_connection(
    mut stream: TcpStream,
    _addr: SocketAddr,
    auth_token: String,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let mut buffer = [0u8; 8192];

    loop {
        // Persistent connection loop with 30-second idle timeout
        let read_result = tokio::time::timeout(
            Duration::from_secs(30),
            stream.read(&mut buffer)
        ).await;

        let n = match read_result {
            Ok(Ok(n)) if n > 0 => n,
            _ => break, // Timeout, EOF or socket error -> gracefully terminate connection
        };

        let request_str = String::from_utf8_lossy(&buffer[..n]);
        let first_line = request_str.lines().next().unwrap_or("");
        let parts: Vec<&str> = first_line.split_whitespace().collect();

        if parts.len() < 2 || parts[0] != "GET" {
            let resp = "HTTP/1.1 405 Method Not Allowed\r\nContent-Length: 0\r\n\r\n";
            let _ = stream.write_all(resp.as_bytes()).await;
            break;
        }

        let path_and_query = parts[1];
        let connection_close = request_str
            .lines()
            .any(|l| l.to_lowercase().starts_with("connection:") && l.to_lowercase().contains("close"));

        // --- Security gate: Host validation + session token (anti-CSRF / anti-DNS-rebinding) ---
        let host_ok = request_str
            .lines()
            .find(|l| l.to_lowercase().starts_with("host:"))
            .map(|l| {
                let v = l.split(':').nth(1).unwrap_or("").trim();
                v.starts_with("127.0.0.1") || v.starts_with("localhost")
            })
            .unwrap_or(false);

        let supplied_token = path_and_query
            .split_once('?')
            .map(|(_, q)| q)
            .and_then(|q| q.split('&').find_map(|kv| kv.strip_prefix("token=")));

        if !host_ok || supplied_token != Some(auth_token.as_str()) {
            let resp = "HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\nConnection: close\r\n\r\n";
            let _ = stream.write_all(resp.as_bytes()).await;
            break;
        }

        if path_and_query.starts_with("/subtitle") {
            let _ = serve_webvtt_subtitle(&mut stream, path_and_query).await;
            break;
        }

        if !path_and_query.starts_with("/stream") {
            let resp = "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n";
            let _ = stream.write_all(resp.as_bytes()).await;
            break;
        }

        // Extract file path from query parameter
        let file_path = if let Some(idx) = path_and_query.find("path=") {
            let encoded_path = &path_and_query[idx + 5..];
            let raw_path = encoded_path.split('&').next().unwrap_or(encoded_path);
            urlencoding::decode(raw_path).unwrap_or_default().into_owned()
        } else {
            String::new()
        };

        let ss_param: Option<f64> = if let Some(idx) = path_and_query.find("ss=") {
            let val_part = &path_and_query[idx + 3..];
            let val_str = val_part.split('&').next().unwrap_or("");
            val_str.parse::<f64>().ok()
        } else {
            None
        };

        let clean_path_str = normalize_file_path(&file_path);
        let target_path = Path::new(&clean_path_str);

        if clean_path_str.is_empty() || !target_path.exists() {
            let resp = "HTTP/1.1 404 Not Found\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: 17\r\n\r\nDosya bulunamadı";
            let _ = stream.write_all(resp.as_bytes()).await;
            break;
        }

        let ext = target_path
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_lowercase();

        // Check for HTTP Range request (e.g. Range: bytes=0-1048575)
        let range_header = request_str
            .lines()
            .find(|l| l.to_lowercase().starts_with("range:"))
            .map(|s| s.to_string());

        // For video files (MP4, MKV, WebM, M4V, MOV, TS), serve directly with HTTP 206 Range support for instant seeking
        if ext == "mp4" || ext == "webm" || ext == "m4v" || ext == "mov" || ext == "mkv" || ext == "ts" {
            let res = serve_file_with_range(&mut stream, target_path, range_header.as_deref(), &ext).await;
            if res.is_err() || connection_close {
                break;
            }
        } else {
            // For other legacy formats (AVI, FLV, WMV), transmux on the fly via FFmpeg to fragmented MP4
            let _ = serve_transmuxed_stream(&mut stream, target_path, ss_param).await;
            break;
        }
    }

    Ok(())
}

/// Converts and serves an embedded subtitle track or external file as WebVTT on the fly.
async fn serve_webvtt_subtitle(
    stream: &mut TcpStream,
    path_and_query: &str,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let file_path = if let Some(idx) = path_and_query.find("path=") {
        let encoded_path = &path_and_query[idx + 5..];
        let raw_path = encoded_path.split('&').next().unwrap_or(encoded_path);
        urlencoding::decode(raw_path).unwrap_or_default().into_owned()
    } else {
        String::new()
    };

    let track_idx: usize = if let Some(idx) = path_and_query.find("track=") {
        let raw_track = &path_and_query[idx + 6..];
        let track_str = raw_track.split('&').next().unwrap_or("0");
        track_str.parse().unwrap_or(0)
    } else {
        0
    };

    let clean = normalize_file_path(&file_path);
    let target = Path::new(&clean);

    if !target.exists() {
        let resp = "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n";
        stream.write_all(resp.as_bytes()).await?;
        return Ok(());
    }

    let ffmpeg_bin = resolve_ffmpeg_path().unwrap_or_else(|| std::path::PathBuf::from("ffmpeg"));
    let map_arg = format!("0:s:{}", track_idx);

    let output = Command::new(&ffmpeg_bin)
        .arg("-v")
        .arg("quiet")
        .arg("-i")
        .arg(target)
        .args(["-map", &map_arg])
        .args(["-f", "webvtt", "pipe:1"])
        .output()
        .await;

    let vtt_bytes = match output {
        Ok(res) if res.status.success() => res.stdout,
        _ => b"WEBVTT\n\n".to_vec(),
    };

    let header = format!(
        "HTTP/1.1 200 OK\r\n\
         Content-Type: text/vtt; charset=utf-8\r\n\
         Content-Length: {}\r\n\
         Connection: close\r\n\r\n",
        vtt_bytes.len()
    );

    stream.write_all(header.as_bytes()).await?;
    stream.write_all(&vtt_bytes).await?;

    Ok(())
}

/// Serves a static video file with full HTTP 206 Partial Content / Range support.
async fn serve_file_with_range(
    stream: &mut TcpStream,
    path: &Path,
    range_header: Option<&str>,
    ext: &str,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let mut file = tokio::fs::File::open(path).await?;
    let total_size = file.metadata().await?.len();

    let mime_type = match ext {
        "webm" => "video/webm",
        "mkv" => "video/x-matroska",
        "ts" => "video/mp2t",
        "m4v" | "mp4" | "mov" => "video/mp4",
        _ => "video/mp4",
    };
    if let Some(r_line) = range_header {
        // Parse range e.g. "Range: bytes=0-1000", "Range: bytes=1000-", or "Range: bytes=-500"
        if let Some(val) = r_line.split(':').nth(1) {
            let clean_val = val.trim().replace("bytes=", "");
            let parts: Vec<&str> = clean_val.split('-').collect();

            let (start, end) = if parts.len() == 2 {
                let p0 = parts[0].trim();
                let p1 = parts[1].trim();
                if p0.is_empty() && !p1.is_empty() {
                    // Suffix range e.g. -500: last 500 bytes
                    let suffix_len = p1.parse::<u64>().unwrap_or(0).min(total_size);
                    (total_size.saturating_sub(suffix_len), total_size.saturating_sub(1))
                } else if !p0.is_empty() && p1.is_empty() {
                    // Open-ended range e.g. 1000-
                    let s = p0.parse::<u64>().unwrap_or(0).min(total_size.saturating_sub(1));
                    (s, total_size.saturating_sub(1))
                } else if !p0.is_empty() && !p1.is_empty() {
                    // Closed range e.g. 0-1048575
                    let s = p0.parse::<u64>().unwrap_or(0);
                    let e = p1.parse::<u64>().unwrap_or(total_size.saturating_sub(1)).min(total_size.saturating_sub(1));
                    (s, e)
                } else {
                    (0, total_size.saturating_sub(1))
                }
            } else {
                (0, total_size.saturating_sub(1))
            };

            if start > end || start >= total_size {
                let header = format!(
                    "HTTP/1.1 416 Range Not Satisfiable\r\n\
                     Content-Range: bytes */{}\r\n\
                     Content-Length: 0\r\n\
                     Connection: keep-alive\r\n\r\n",
                    total_size
                );
                stream.write_all(header.as_bytes()).await?;
                return Ok(());
            }

            let content_len = end - start + 1;

            let header = format!(
                "HTTP/1.1 206 Partial Content\r\n\
                 Content-Type: {}\r\n\
                 Content-Range: bytes {}-{}/{}\r\n\
                 Content-Length: {}\r\n\
                 Accept-Ranges: bytes\r\n\
                 Connection: keep-alive\r\n\r\n",
                mime_type, start, end, total_size, content_len
            );

            stream.write_all(header.as_bytes()).await?;

            file.seek(std::io::SeekFrom::Start(start)).await?;
            let mut remaining = content_len;
            let mut chunk = vec![0u8; 64 * 1024];

            while remaining > 0 {
                let to_read = (remaining as usize).min(chunk.len());
                let read_bytes = file.read(&mut chunk[..to_read]).await?;
                if read_bytes == 0 {
                    break;
                }
                if stream.write_all(&chunk[..read_bytes]).await.is_err() {
                    break;
                }
                remaining -= read_bytes as u64;
            }

            return Ok(());
        }
    }

    // Default 200 OK full stream
    let header = format!(
        "HTTP/1.1 200 OK\r\n\
         Content-Type: {}\r\n\
         Content-Length: {}\r\n\
         Accept-Ranges: bytes\r\n\
         Connection: keep-alive\r\n\r\n",
        mime_type, total_size
    );

    stream.write_all(header.as_bytes()).await?;
    let mut chunk = vec![0u8; 64 * 1024];
    loop {
        let read_bytes = file.read(&mut chunk).await?;
        if read_bytes == 0 {
            break;
        }
        if stream.write_all(&chunk[..read_bytes]).await.is_err() {
            break;
        }
    }

    Ok(())
}

/// Transmuxes non-standard/MKV videos on the fly using FFmpeg to fragmented MP4.
async fn serve_transmuxed_stream(
    stream: &mut TcpStream,
    path: &Path,
    ss_param: Option<f64>,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let ffmpeg_bin = resolve_ffmpeg_path().unwrap_or_else(|| std::path::PathBuf::from("ffmpeg"));

    let mut cmd = Command::new(&ffmpeg_bin);
    cmd.arg("-v").arg("quiet");

    if let Some(ss) = ss_param {
        if ss > 0.0 {
            cmd.arg("-ss").arg(format!("{:.3}", ss));
        }
    }

    cmd.arg("-i").arg(path);
    cmd.args([
        "-f", "mp4",
        "-movflags", "frag_keyframe+empty_moov+default_base_moof",
        "-c:v", "copy",
        "-c:a", "aac",
        "-b:a", "192k",
        "pipe:1",
    ]);
    cmd.stdout(std::process::Stdio::piped());
    cmd.stderr(std::process::Stdio::null());

    let mut child = cmd.spawn()?;
    let mut stdout = child.stdout.take().ok_or("FFmpeg stdout alınamadı")?;

    let header = "HTTP/1.1 200 OK\r\n\
                  Content-Type: video/mp4\r\n\
                  Accept-Ranges: none\r\n\
                  Connection: close\r\n\r\n";

    stream.write_all(header.as_bytes()).await?;

    let mut buffer = vec![0u8; 64 * 1024];
    while let Ok(n) = stdout.read(&mut buffer).await {
        if n == 0 {
            break;
        }
        if stream.write_all(&buffer[..n]).await.is_err() {
            break;
        }
    }

    let _ = child.kill().await;
    Ok(())
}
#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[tokio::test]
    async fn test_media_streamer_server_bind() {
        let server = MediaStreamerServer::start().await.unwrap();
        assert!(server.port > 0);
        let url = server.get_stream_url("/test/video.mp4");
        assert!(url.starts_with(&format!("http://127.0.0.1:{}/stream?path=", server.port)));
        let sub_url = server.get_subtitle_url("/test/video.mp4", 0);
        assert!(sub_url.contains("/subtitle?path="));
        assert!(sub_url.contains("&track=0"));
    }

    #[tokio::test]
    async fn test_streamer_http_range_and_persistent_connection() {
        let server = MediaStreamerServer::start().await.unwrap();
        
        // Create temporary test file
        let temp_dir = tempfile::tempdir().unwrap();
        let file_path = temp_dir.path().join("test_sample.mp4");
        {
            let mut f = std::fs::File::create(&file_path).unwrap();
            let sample_data = vec![0xABu8; 1000]; // 1000 bytes
            f.write_all(&sample_data).unwrap();
        }

        let path_str = file_path.to_str().unwrap();
        let encoded: String = urlencoding::encode(path_str).into_owned();

        // Connect via TCP
        let mut stream = TcpStream::connect(format!("127.0.0.1:{}", server.port)).await.unwrap();

        async fn read_full_http_response(stream: &mut TcpStream) -> (String, Vec<u8>) {
            let mut raw = Vec::new();
            let mut buf = [0u8; 1024];
            
            // Read until headers are received
            let header_end_pos;
            loop {
                let n = stream.read(&mut buf).await.unwrap();
                if n == 0 {
                    panic!("Premature EOF while reading headers");
                }
                raw.extend_from_slice(&buf[..n]);
                if let Some(pos) = raw.windows(4).position(|w| w == b"\r\n\r\n") {
                    header_end_pos = pos + 4;
                    break;
                }
            }

            let header_str = String::from_utf8_lossy(&raw[..header_end_pos]).to_string();
            let content_len: usize = header_str
                .lines()
                .find(|l| l.to_lowercase().starts_with("content-length:"))
                .and_then(|l| l.split(':').nth(1))
                .and_then(|v| v.trim().parse().ok())
                .unwrap_or(0);

            let mut body = raw[header_end_pos..].to_vec();
            while body.len() < content_len {
                let n = stream.read(&mut buf).await.unwrap();
                if n == 0 {
                    break;
                }
                body.extend_from_slice(&buf[..n]);
            }

            (header_str, body)
        }

        // 1. Request first range (bytes=0-99)
        let req1 = format!(
            "GET /stream?path={}&token={} HTTP/1.1\r\nHost: 127.0.0.1\r\nRange: bytes=0-99\r\n\r\n",
            encoded, server.auth_token
        );
        stream.write_all(req1.as_bytes()).await.unwrap();
        let (resp1_headers, resp1_body) = read_full_http_response(&mut stream).await;
        assert!(resp1_headers.contains("206 Partial Content"), "Response: {}", resp1_headers);
        assert!(resp1_headers.contains("Content-Range: bytes 0-99/1000"));
        assert!(resp1_headers.contains("Content-Length: 100"));
        assert_eq!(resp1_body.len(), 100);
        assert_eq!(resp1_body[0], 0xAB);

        // 2. Request second range on the SAME socket (Keep-Alive) (bytes=500-599)
        let req2 = format!(
            "GET /stream?path={}&token={} HTTP/1.1\r\nHost: 127.0.0.1\r\nRange: bytes=500-599\r\n\r\n",
            encoded, server.auth_token
        );
        stream.write_all(req2.as_bytes()).await.unwrap();
        let (resp2_headers, resp2_body) = read_full_http_response(&mut stream).await;
        assert!(resp2_headers.contains("206 Partial Content"), "Response: {}", resp2_headers);
        assert!(resp2_headers.contains("Content-Range: bytes 500-599/1000"));
        assert!(resp2_headers.contains("Content-Length: 100"));
        assert_eq!(resp2_body.len(), 100);
        assert_eq!(resp2_body[0], 0xAB);
    }

    #[tokio::test]
    async fn test_streamer_mkv_direct_range_support() {
        let server = MediaStreamerServer::start().await.unwrap();
        let temp_dir = std::env::temp_dir();
        let mkv_path = temp_dir.join("test_sample.mkv");
        {
            let mut f = std::fs::File::create(&mkv_path).unwrap();
            let sample_data = vec![0x1Au8; 2000]; // 2000 bytes
            f.write_all(&sample_data).unwrap();
        }

        let path_str = mkv_path.to_str().unwrap();
        let encoded: String = urlencoding::encode(path_str).into_owned();

        let mut stream = TcpStream::connect(format!("127.0.0.1:{}", server.port)).await.unwrap();

        let req = format!(
            "GET /stream?path={}&token={} HTTP/1.1\r\nHost: 127.0.0.1\r\nRange: bytes=100-299\r\n\r\n",
            encoded, server.auth_token
        );
        stream.write_all(req.as_bytes()).await.unwrap();

        let mut buf = [0u8; 1024];
        let n = stream.read(&mut buf).await.unwrap();
        let header_str = String::from_utf8_lossy(&buf[..n]);
        assert!(header_str.contains("206 Partial Content"));
        assert!(header_str.contains("Content-Range: bytes 100-299/2000"));
        assert!(header_str.contains("Content-Length: 200"));

        let _ = std::fs::remove_file(&mkv_path);
    }

    #[tokio::test]
    async fn test_streamer_rejects_missing_token_and_bad_host() {
        let server = MediaStreamerServer::start().await.unwrap();
        let temp_dir = tempfile::tempdir().unwrap();
        let file_path = temp_dir.path().join("auth_probe.mp4");
        {
            let mut f = std::fs::File::create(&file_path).unwrap();
            f.write_all(&vec![0x41u8; 500]).unwrap();
        }
        let encoded: String = urlencoding::encode(file_path.to_str().unwrap()).into_owned();

        // 1. Missing token -> 403
        let mut s1 = TcpStream::connect(format!("127.0.0.1:{}", server.port)).await.unwrap();
        let req_no_token = format!(
            "GET /stream?path={} HTTP/1.1\r\nHost: 127.0.0.1\r\n\r\n",
            encoded
        );
        s1.write_all(req_no_token.as_bytes()).await.unwrap();
        let mut buf1 = [0u8; 256];
        let n1 = s1.read(&mut buf1).await.unwrap();
        assert!(String::from_utf8_lossy(&buf1[..n1]).contains("403 Forbidden"));

        // 2. Wrong token -> 403
        let mut s2 = TcpStream::connect(format!("127.0.0.1:{}", server.port)).await.unwrap();
        let req_bad_token = format!(
            "GET /stream?path={}&token=wrong-token HTTP/1.1\r\nHost: 127.0.0.1\r\n\r\n",
            encoded
        );
        s2.write_all(req_bad_token.as_bytes()).await.unwrap();
        let mut buf2 = [0u8; 256];
        let n2 = s2.read(&mut buf2).await.unwrap();
        assert!(String::from_utf8_lossy(&buf2[..n2]).contains("403 Forbidden"));

        // 3. Valid token but foreign Host header (DNS-rebinding) -> 403
        let mut s3 = TcpStream::connect(format!("127.0.0.1:{}", server.port)).await.unwrap();
        let req_bad_host = format!(
            "GET /stream?path={}&token={} HTTP/1.1\r\nHost: evil.example.com\r\n\r\n",
            encoded, server.auth_token
        );
        s3.write_all(req_bad_host.as_bytes()).await.unwrap();
        let mut buf3 = [0u8; 256];
        let n3 = s3.read(&mut buf3).await.unwrap();
        assert!(String::from_utf8_lossy(&buf3[..n3]).contains("403 Forbidden"));
    }
}
