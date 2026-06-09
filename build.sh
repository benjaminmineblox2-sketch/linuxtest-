#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)/vortex-poc"
OUTDIR="$ROOT_DIR-dist-linux"

rm -rf "$OUTDIR"
mkdir -p "$OUTDIR"

# rsync may not be available; use tar/cp as fallback
if command -v rsync >/dev/null 2>&1; then
  rsync -a --exclude 'node_modules' --exclude 'build' "$ROOT_DIR/" "$OUTDIR/"
else
  cp -R "$ROOT_DIR/"* "$OUTDIR/"
  rm -rf "$OUTDIR/node_modules" "$OUTDIR/build" || true
fi

tar -C "$(dirname "$OUTDIR")" -czf "$OUTDIR.tar.gz" "$(basename "$OUTDIR")"
echo "Created $OUTDIR.tar.gz"
