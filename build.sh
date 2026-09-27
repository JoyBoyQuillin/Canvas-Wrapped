#!/usr/bin/env bash
# Builds the Canvas Wrapped Firefox extension from source.
# Usage: ./build.sh        (run from the folder that contains this file)
set -euo pipefail
cd "$(dirname "$0")"

PNPM_VERSION="10.18.3"

# Node.js 20+ is required (22 LTS recommended).
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "Error: Node.js 20 or newer is required (found $(node -v))." >&2
  exit 1
fi

# Run pnpm through Corepack (bundled with Node.js) pinned to an exact version.
# Calling `corepack pnpm@<version>` needs no global install and no write access to /usr/bin
# (unlike `corepack enable`, which fails with EACCES on system-wide Node installs).
PNPM="corepack pnpm@${PNPM_VERSION}"
$PNPM --version

# Install exact dependency versions from pnpm-lock.yaml (postinstall runs `wxt prepare`).
$PNPM install --frozen-lockfile

# Build the Firefox (Manifest V2) extension.
$PNPM wxt build -b firefox

echo
echo "Build complete. Output: $(pwd)/.output/firefox-mv2/"
