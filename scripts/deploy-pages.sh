#!/usr/bin/env bash

set -euo pipefail

# 中文注释：无论脚本从哪个目录触发，都先切回仓库根目录，避免 dist/wrangler.jsonc 相对路径失效。
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$REPO_ROOT"

# 中文注释：固定 Pages 项目名，避免每次手动输入时拼错。
PROJECT_NAME="zhuwei-blog"
# 中文注释：不同电脑的 Node 安装目录可能不同；需要指定时传 DEPLOY_NODE_BIN，不在脚本里写死个人目录。
DEPLOY_NODE_BIN="${DEPLOY_NODE_BIN:-}"

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
  # 中文注释：工作电脑若有多套 Node，可用 DEPLOY_NODE_BIN 明确指定本次部署使用的版本。
  if [ -n "$DEPLOY_NODE_BIN" ] && [ -x "$DEPLOY_NODE_BIN/node" ]; then
    echo "$DEPLOY_NODE_BIN"
    return 0
  fi

  # 中文注释：默认复用当前终端里已经生效的 Node，兼容 nvm、Homebrew、Volta 等常见安装方式。
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

resolve_git_branch() {
  if command -v git >/dev/null 2>&1 && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    # 中文注释：优先读取当前分支名，失败时回退到 main，避免部署元数据缺失。
    git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main"
    return 0
  fi

  echo "main"
}

resolve_git_hash() {
  if command -v git >/dev/null 2>&1 && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    # 中文注释：如果存在 Git 提交，则显式附带提交哈希，避免 Wrangler 自己解析异常元数据。
    git rev-parse HEAD 2>/dev/null || true
    return 0
  fi

  echo ""
}

NODE_BIN="$(resolve_node_bin)"
GIT_BRANCH="$(resolve_git_branch)"
GIT_HASH="$(resolve_git_hash)"
# 中文注释：提交说明强制使用 ASCII，绕过 Cloudflare 对本地提交消息编码的严格校验。
DEPLOY_MESSAGE="manual deploy from ${GIT_BRANCH}"

if [ -z "$NODE_BIN" ]; then
  echo "未找到可用的 Node.js 运行时。Astro 6 需要 Node >= 22.12.0。"
  echo "请先在当前终端启用 Node 22/24，或通过 DEPLOY_NODE_BIN 指定 Node 的 bin 目录。"
  exit 1
fi

# 中文注释：把匹配版本的 Node 放到 PATH 最前面，确保 npm/npx 使用同一套运行时。
export PATH="$NODE_BIN:$PATH"

echo "使用 Node: $(node -v)"

# 中文注释：部署必须使用仓库锁定的 Astro/Wrangler，缺少依赖时直接提示，避免 npx 临时下载不同版本。
if [ ! -x "node_modules/.bin/astro" ] || [ ! -x "node_modules/.bin/wrangler" ]; then
  echo "项目依赖尚未安装，请先执行 npm ci（锁文件变化时可执行 npm install）。"
  exit 1
fi

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
if [ -n "$GIT_HASH" ]; then
  # 中文注释：npm exec 只调用项目本地 Wrangler；工作电脑首次发布前需先执行 npx wrangler login。
  npm exec -- wrangler pages deploy dist \
    --project-name "$PROJECT_NAME" \
    --branch "$GIT_BRANCH" \
    --commit-hash "$GIT_HASH" \
    --commit-message "$DEPLOY_MESSAGE"
else
  npm exec -- wrangler pages deploy dist \
    --project-name "$PROJECT_NAME" \
    --branch "$GIT_BRANCH" \
    --commit-message "$DEPLOY_MESSAGE"
fi
