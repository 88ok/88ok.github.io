#!/usr/bin/env bash
# Cloudflare Pages build script for 追风笔记 (Oink / Hugo Modules)
#
# Why this exists:
#   - The site uses Hugo Modules (go.mod pulls github.com/pgsty/oink), which
#     requires the Go toolchain at build time to resolve modules.
#   - Cloudflare Pages build environment does NOT ship Go by default, and its
#     managed Hugo may be the non-extended build (Oink needs extended Hugo).
#   So we install both here, then build.
#
# Usage (CF Pages dashboard -> Build command):  bash scripts/build-cf.sh
# Output directory in CF:  public
set -euo pipefail

GO_VERSION=1.23.4
HUGO_VERSION=0.165.0

echo ">> Installing Go ${GO_VERSION}"
curl -fsSL "https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz" -o /tmp/go.tgz
tar -C /tmp -xzf /tmp/go.tgz
export PATH="$PATH:/tmp/go/bin"

echo ">> Installing Hugo extended ${HUGO_VERSION}"
curl -fsSL "https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/hugo_extended_${HUGO_VERSION}_linux-amd64.tar.gz" -o /tmp/hugo.tgz
tar -C /tmp -xzf /tmp/hugo.tgz

# Override baseURL with the CF Pages deployment URL so absolute links point
# to the live CF site (not the hardcoded github.io in hugo.yaml).
# CF_PAGES_URL is injected by Cloudflare only in the *build* command context;
# guard with a default (root-relative) so the script never crashes under `set -u`.
BASE_URL="${CF_PAGES_URL:-/}"
BASE_URL="${BASE_URL%/}/"
echo ">> Building with baseURL=${BASE_URL}"
/tmp/hugo --baseURL "${BASE_URL}" --gc --minify
