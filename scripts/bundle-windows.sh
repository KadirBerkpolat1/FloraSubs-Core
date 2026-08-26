#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BIN_DIR="$PROJECT_ROOT/src-tauri/bin"

cd "$PROJECT_ROOT"

echo "========================================================"
echo "  FloraSubs Reborn - Windows Packaging & Bundler"
echo "========================================================"

# Step 1: Ensure Windows static FFmpeg binaries exist in src-tauri/bin
mkdir -p "$BIN_DIR"
if [ ! -f "$BIN_DIR/ffmpeg.exe" ] || [ ! -f "$BIN_DIR/ffprobe.exe" ]; then
    echo "[1/4] Windows FFmpeg binaries missing in $BIN_DIR. Fetching static FFmpeg 7.1 build..."
    WIN_FFMPEG_URL="https://github.com/GyanD/codexffmpeg/releases/download/7.1/ffmpeg-7.1-full_build.zip"
    TEMP_ZIP=$(mktemp --suffix=.zip)
    curl -fL -o "$TEMP_ZIP" "$WIN_FFMPEG_URL"
    echo "Extracting ffmpeg.exe and ffprobe.exe..."
    unzip -j -o "$TEMP_ZIP" "*/bin/ffmpeg.exe" "*/bin/ffprobe.exe" -d "$BIN_DIR/"
    rm -f "$TEMP_ZIP"
    echo "Static FFmpeg binaries successfully placed in $BIN_DIR"
else
    echo "[1/4] Static Windows FFmpeg binaries found in $BIN_DIR."
fi

# Step 2: Install frontend dependencies and build production assets
echo "[2/4] Building Vite + React + Tailwind frontend..."
bun install --frozen-lockfile || bun install
bun run build

# Step 3: Build Tauri Windows Bundle (NSIS Setup & Portable Binary)
echo "[3/4] Compiling Tauri v2 Backend & Packaging Windows Bundles..."
if command -v bun &> /dev/null && [ -f "$PROJECT_ROOT/node_modules/.bin/tauri" ]; then
    bun run tauri build --target x86_64-pc-windows-msvc || cargo tauri build
else
    cargo build --release --manifest-path "$PROJECT_ROOT/src-tauri/Cargo.toml"
fi

# Step 4: Verification
echo "[4/4] Verifying generated bundle artifacts..."
BUNDLE_DIR="$PROJECT_ROOT/src-tauri/target/x86_64-pc-windows-msvc/release/bundle"
if [ -d "$BUNDLE_DIR" ]; then
    echo "Generated Windows Bundles in $BUNDLE_DIR:"
    find "$BUNDLE_DIR" -type f \( -name "*.exe" -o -name "*.msi" \) -exec ls -lh {} +
else
    echo "Release build completed in target directory."
fi

echo "========================================================"
echo "  FloraSubs Reborn Windows Packaging Completed!"
echo "========================================================"
