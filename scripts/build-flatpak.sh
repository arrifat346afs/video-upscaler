#!/bin/bash
set -euo pipefail

APP_ID="io.github.arrifat346afs.TuxScale"
MANIFEST="flatpak/${APP_ID}.yml"
BUILD_DIR="flatpak/build-dir"

# ── Clean previous build dir (can cause permission issues with electron-builder) ──
rm -rf "$BUILD_DIR"

# ── Prerequisites ──────────────────────────────────────────────
command -v flatpak-builder >/dev/null 2>&1 || {
  echo "ERROR: flatpak-builder not found. Install it with:"
  echo "  sudo pacman -S flatpak-builder"
  exit 1
}

flatpak info "org.electronjs.Electron2.BaseApp//25.08" &>/dev/null || {
  echo "ERROR: Electron BaseApp runtime not installed. Install it with:"
  echo "  flatpak install flathub org.electronjs.Electron2.BaseApp//25.08"
  exit 1
}

# ── 1. Build the Vite/Electron app ────────────────────────────
echo "==> Building Electron app (Vite)..."
bun run build

# ── 2. Package only the zip ───────────────────────────────────
echo "==> Packaging Linux zip..."
ZIP="dist/tuxscale-${npm_package_version:-1.2.0}-linux-x64.zip"

# Try electron-builder first, fall back to manual packaging
if npx electron-builder --linux zip 2>/dev/null; then
  echo "==> electron-builder succeeded, using its output"
  ZIP=$(ls dist/tuxscale-*.zip 2>/dev/null | head -1)
else
  echo "==> electron-builder failed, packaging manually"
  rm -rf dist/linux-unpacked
  cp -r node_modules/electron/dist dist/linux-unpacked
  mv dist/linux-unpacked/electron dist/linux-unpacked/tuxscale

  mkdir -p dist/linux-unpacked/resources/app
  cp -r out dist/linux-unpacked/resources/app/out
  cp package.json dist/linux-unpacked/resources/app/
  rm -f dist/linux-unpacked/resources/default_app.asar

  # Include runtime node_modules (used by main/preload, not bundled by Vite)
  mkdir -p dist/linux-unpacked/resources/app/node_modules/@electron-toolkit
  cp -r node_modules/@electron-toolkit/utils dist/linux-unpacked/resources/app/node_modules/@electron-toolkit/
  cp -r node_modules/@electron-toolkit/preload dist/linux-unpacked/resources/app/node_modules/@electron-toolkit/

  cp -r resources/linux/bin dist/linux-unpacked/resources/linux/ 2>/dev/null || true
  cp -r resources/models dist/linux-unpacked/resources/models/ 2>/dev/null || true
  cp resources/icon.png dist/linux-unpacked/resources/ 2>/dev/null || true
  cp resources/icons/512x512.png dist/linux-unpacked/resources/ 2>/dev/null || true
  cp resources/icons/128x128.png dist/linux-unpacked/resources/ 2>/dev/null || true

  rm -f "$ZIP"
  cd dist/linux-unpacked && 7z a -tzip "../$(basename "$ZIP")" . >/dev/null && cd ../..
  echo "==> Created: $ZIP"
fi

# ── 3. Compute SHA256 ──────────────────────────────────────────
if [ ! -f "$ZIP" ]; then
  echo "ERROR: no tuxscale-*.zip found in dist/"
  exit 1
fi

SHA256=$(sha256sum "$ZIP" | cut -d' ' -f1)
echo "==> Using zip: $ZIP"
echo "    SHA256: $SHA256"

# Copy zip into the flatpak directory for local path reference
cp "$ZIP" "flatpak/tuxscale-linux.zip"

# ── 4. Generate a temporary manifest with local source ────────
TMP_MANIFEST="flatpak/${APP_ID}.local.yml"
echo "==> Generating temporary manifest: $TMP_MANIFEST"

# Collapse YAML script continuation lines (backslash-newline) since
# flatpak-builder's script source type treats each line as a separate command.
perl -0pe 's/\\\n\s{2,}//g' "$MANIFEST" | \
sed "s|url: https://github.com/rifat/tuxscale/releases/download/v1.0.0/tuxscale-1.0.0-linux-x64.zip|path: tuxscale-linux.zip|; \
     s|sha256: PLACEHOLDER|sha256: $SHA256|" \
  > "$TMP_MANIFEST"

# ── 5. Build the Flatpak ─────────────────────────────────────
echo "==> Building Flatpak..."
flatpak-builder --force-clean "$BUILD_DIR" "$TMP_MANIFEST"

# ── 6. Install locally ───────────────────────────────────────
echo "==> Installing Flatpak..."
flatpak-builder --user --install --force-clean "$BUILD_DIR" "$TMP_MANIFEST"

# ── 7. Clean up ──────────────────────────────────────────────
echo "==> Cleaning up..."
rm -f "$TMP_MANIFEST" "flatpak/tuxscale-linux.zip"

echo ""
echo "✓ Done! Run the app with: flatpak run $APP_ID"
