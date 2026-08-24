#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BIN_DIR="$PROJECT_ROOT/src-tauri/bin"

mkdir -p "$BIN_DIR"

echo "==> FloraSubs Static FFmpeg Downloader <=="

# Download official static Windows build with libass & hardware acceleration if on Windows / preparing bundle
WIN_FFMPEG_URL="https://github.com/GyanD/codexffmpeg/releases/download/7.1/ffmpeg-7.1-full_build.zip"

echo "Downloading static FFmpeg 7.x Windows binary..."
TEMP_ZIP=$(mktemp --suffix=.zip)
curl -L -o "$TEMP_ZIP" "$WIN_FFMPEG_URL"

echo "Extracting ffmpeg.exe and ffprobe.exe..."
unzip -j -o "$TEMP_ZIP" "*/bin/ffmpeg.exe" "*/bin/ffprobe.exe" -d "$BIN_DIR/"
rm -f "$TEMP_ZIP"

echo "==> Successfully bundled static FFmpeg into $BIN_DIR <="
ls -lh "$BIN_DIR"
