#!/bin/bash
set -euo pipefail

ASSETS_URL=$(curl -sfL https://api.github.com/repos/upscayl/upscayl-ncnn/releases/latest | jq -r '.assets_url')

DOWNLOAD_URL=$(curl -sfL "$ASSETS_URL" | jq -r '.[] | select(.name | test("-linux\\.zip$")) | .browser_download_url')

echo "Downloading upscayl-bin for Linux from: $DOWNLOAD_URL"
curl -sfL -o upscayl-linux.zip "$DOWNLOAD_URL"

unzip -q upscayl-linux.zip -d upscayl-extracted

TARGET_DIR="resources/linux/bin"
mkdir -p "$TARGET_DIR"

BINARY=$(find upscayl-extracted -name 'upscayl-bin' -type f | head -1)
if [ -z "$BINARY" ]; then
  echo "Error: upscayl-bin not found in extracted files"
  exit 1
fi

cp "$BINARY" "$TARGET_DIR/upscayl-bin"
chmod +x "$TARGET_DIR/upscayl-bin"

rm -rf upscayl-extracted upscayl-linux.zip

echo "Updated $TARGET_DIR/upscayl-bin"
