#!/usr/bin/env bash
# build.sh — 追风笔记标准构建（本地 / GitHub Pages / 任意自定义域名通用）
#
# 用法：
#   bash scripts/build.sh                      # 本地构建，产物与域名解耦
#   bash scripts/build.sh --baseURL https://x/ # 如需也可临时覆盖 baseURL（剥离后无影响）
#
# 输出：public/ —— 全部内部链接为根相对，可部署到 github.io / *.pages.dev / 任意域名。
set -euo pipefail

cd "$(dirname "$0")/.."

HUGO="${HUGO:-hugo}"

echo ">> Hugo 构建"
"$HUGO" --cleanDestinationDir --gc --minify --environment production --printPathWarnings --panicOnWarning "$@"

echo ">> 剥离硬编码域名"
bash scripts/strip-domain.sh public

echo ">> 完成：public/ 已与域名解耦，可部署到任意域名"
