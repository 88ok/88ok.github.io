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

# 构建：baseURL 用 hugo.yaml 默认值即可，构建后统一剥离 88ok.github.io 域名为根相对，
# 使同一份产物既可用于 *.pages.dev，也可用于后续绑定的任意自定义域名，互不跳链。
# （旧的 CF_PAGES_URL 覆盖方案仅对 pages.dev 生效，绑定自定义域名后仍会跳回 pages.dev，
# 故改为与本地一致的「剥离域名」方案，见 scripts/strip-domain.sh。）
echo ">> Building"
/tmp/hugo --gc --minify

echo ">> 剥离硬编码域名（与本地 build.sh 一致）"
bash "$(dirname "$0")/strip-domain.sh" public
