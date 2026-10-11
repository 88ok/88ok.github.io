#!/usr/bin/env bash
# strip-domain.sh — 把 Hugo 构建产物中的硬编码域名 88ok.github.io 剥离为根相对路径，
# 使同一份 public/ 可原样部署到任意域名（github.io / *.pages.dev / 自定义域名），互不跳链。
#
# 原理：Hugo 主题用 .Permalink 生成大量绝对地址（标签徽章、栏目/博客链接、RSS <link>、
# og:url、复制链接动作清单、alias 重定向桩等），relativeURLs 无法覆盖其中一部分。
# 构建后统一把 https?://88ok.github.io/ 与 //88ok.github.io/ 替换为空（保留后面的 /path），
# 全部变为根相对。对主题升级零耦合，且天然覆盖未来新增的绝对链接。
#
# 注意：sitemap*.xml 必须保留绝对地址（搜索引擎规范要求），故被排除在剥离之外；
# sitemap 指向 github.io 仅影响 SEO 提交，不会导致页面跳转，属可接受的已知限制。
set -euo pipefail

PUBLIC_DIR="${1:-public}"
DOMAIN="88ok.github.io"

if [ ! -d "$PUBLIC_DIR" ]; then
  echo "strip-domain: 目录不存在 -> ${PUBLIC_DIR}" >&2
  exit 1
fi

# 判断 sed 风格（macOS BSD sed vs GNU sed），统一跨平台
if sed --version >/dev/null 2>&1; then
  SED_INPLACE=(-i -E)
else
  SED_INPLACE=(-i '' -E)
fi

echo ">> 剥离域名 ${DOMAIN} -> 根相对（排除 sitemap*.xml）"

count=0
while IFS= read -r -d '' f; do
  case "$(basename "$f")" in
    sitemap*.xml) continue ;;
  esac
  # 先去 https?:// 形态，再去协议相对的 // 形态（顺序不可颠倒，否则会误伤 https:）。
  # 关键点：把「域名 + 斜杠」整体替换为单个「/」，而非删除为空——
  # 否则会留下页相对路径（如 tags/redis/ 在深层页被解析成 /blog/x/tags/redis/ 而 404），
  # 且 og:url、复制链接等会丢失成空串。替换为 / 后一律得到根相对路径。
  sed "${SED_INPLACE[@]}" "s#https?://${DOMAIN}/#/#g" "$f"
  sed "${SED_INPLACE[@]}" "s#//${DOMAIN}/#/#g" "$f"
  count=$((count + 1))
done < <(find "$PUBLIC_DIR" -type f \( -name '*.html' -o -name '*.xml' -o -name '*.json' -o -name '*.js' -o -name '*.css' -o -name '*.txt' \) -print0)

echo ">> 已处理 ${count} 个文件，产物已与域名解耦"
