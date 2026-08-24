#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo "==> Building FloraSubs Reborn (React + Tauri v2) <=="

# Step 1: Install frontend deps and build production assets
echo "1. Building Vite Frontend..."
bun install
bun run build

# Step 2: Build Tauri desktop application
echo "2. Building Tauri Application..."
cargo build --release --manifest-path "$PROJECT_ROOT/src-tauri/Cargo.toml"

echo "==> Build Completed Successfully! <=="
