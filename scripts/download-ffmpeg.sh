#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BIN_DIR="$PROJECT_ROOT/src-tauri/bin"

mkdir -p "$BIN_DIR"

echo "==> FloraSubs Static FFmpeg Downloader <=="

case "$(uname -s)" in
  Linux)
    # Static Linux build (amd64), libass + hardware encoders included
    LINUX_FFMPEG_URL="https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz"
    echo "Downloading static Linux FFmpeg (amd64)..."
    TEMP_TAR=$(mktemp --suffix=.tar.xz)
    curl -fL -o "$TEMP_TAR" "$LINUX_FFMPEG_URL"
    EXTRACT_DIR=$(mktemp -d)
    tar -xJf "$TEMP_TAR" -C "$EXTRACT_DIR"
    SRC_DIR=$(find "$EXTRACT_DIR" -maxdepth 1 -type d -name 'ffmpeg-*' | head -n 1)
    cp "$SRC_DIR/ffmpeg" "$BIN_DIR/ffmpeg"
    cp "$SRC_DIR/ffprobe" "$BIN_DIR/ffprobe"
    chmod +x "$BIN_DIR/ffmpeg" "$BIN_DIR/ffprobe"
    rm -rf "$TEMP_TAR" "$EXTRACT_DIR"
    ;;
  MINGW*|MSYS*|CYGWIN*)
    # Static Windows build with libass & hardware acceleration
    WIN_FFMPEG_URL="https://github.com/GyanD/codexffmpeg/releases/download/7.1/ffmpeg-7.1-full_build.zip"
    echo "Downloading static FFmpeg 7.x Windows binary..."
    TEMP_ZIP=$(mktemp --suffix=.zip)
    curl -fL -o "$TEMP_ZIP" "$WIN_FFMPEG_URL"
    echo "Extracting ffmpeg.exe and ffprobe.exe..."
    unzip -j -o "$TEMP_ZIP" "*/bin/ffmpeg.exe" "*/bin/ffprobe.exe" -d "$BIN_DIR/"
    rm -f "$TEMP_ZIP"
    ;;
  Darwin)
    echo "macOS otomatik indirme desteklenmiyor. Lütfen 'brew install ffmpeg' kullanın." >&2
    exit 1
    ;;
  *)
    echo "Bilinmeyen platform: $(uname -s)" >&2
    exit 1
    ;;
esac

echo "==> Successfully bundled FFmpeg into $BIN_DIR <=="
ls -lh "$BIN_DIR"
