#!/usr/bin/env bash

set -euo pipefail

# 中文注释：无论脚本从哪个目录触发，都先切回仓库根目录，避免 dist/wrangler.jsonc 相对路径失效。
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$REPO_ROOT"

# 中文注释：固定 Pages 项目名，避免每次手动输入时拼错。
PROJECT_NAME="zhuwei-blog"
# 中文注释：优先复用工作区自带的 Node 运行时，避免本机全局 Node 版本不满足 Astro 要求。
CODEX_NODE_BIN="/Users/zhuwei/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin"

USE_CHECK="false"
BUILD_ONLY="false"

for arg in "$@"; do
  case "$arg" in
    --check)
      USE_CHECK="true"
      ;;
    --build-only)
      BUILD_ONLY="true"
      ;;
    *)
      echo "不支持的参数: $arg"
      echo "用法: ./scripts/deploy-pages.sh [--check] [--build-only]"
      exit 1
      ;;
  esac
done

resolve_node_bin() {
  if [ -x "$CODEX_NODE_BIN/node" ]; then
    echo "$CODEX_NODE_BIN"
    return 0
  fi

  if command -v node >/dev/null 2>&1; then
    local major
    local minor
    major="$(node -p 'process.versions.node.split(".")[0]')"
    minor="$(node -p 'process.versions.node.split(".")[1]')"
    if [ "$major" -gt 22 ] || { [ "$major" -eq 22 ] && [ "$minor" -ge 12 ]; }; then
      dirname "$(command -v node)"
      return 0
    fi
  fi

  echo ""
}

NODE_BIN="$(resolve_node_bin)"

if [ -z "$NODE_BIN" ]; then
  echo "未找到可用的 Node.js 运行时。Astro 6 需要 Node >= 22.12.0。"
  echo "建议先安装 Node 22/24，或在 Codex 桌面环境里执行该脚本。"
  exit 1
fi

# 中文注释：把匹配版本的 Node 放到 PATH 最前面，确保 npm/npx 使用同一套运行时。
export PATH="$NODE_BIN:$PATH"

echo "使用 Node: $(node -v)"
echo "开始构建项目..."
npm run build

if [ "$USE_CHECK" = "true" ]; then
  echo "开始执行类型检查..."
  npm run check
fi

if [ "$BUILD_ONLY" = "true" ]; then
  echo "已完成构建，按参数要求跳过正式部署。"
  exit 0
fi

echo "开始发布到 Cloudflare Pages 项目: $PROJECT_NAME"
npx wrangler pages deploy dist --project-name "$PROJECT_NAME"
