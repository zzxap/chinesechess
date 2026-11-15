#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

usage() {
  cat <<'EOF'
用法：
  ./build_release.sh v0.0.3
  ./build_release.sh 0.0.3 "本次提交说明"

自动提交当前工作区中未忽略的修改，创建版本 tag，
将当前分支和 tag 一起推送到 origin，触发四个平台的 Actions 构建。
发布前请先在 GitHub 配好签名 Secrets。
EOF
}

die() { printf '错误：%s\n' "$*" >&2; exit 1; }

if [[ "${1:-}" == --help || "${1:-}" == -h ]]; then usage; exit 0; fi
if [[ $# -lt 1 || $# -gt 2 ]]; then usage; exit 2; fi

RELEASE_VERSION="${1#v}"
if [[ ! "${RELEASE_VERSION}" =~ ^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-[0-9A-Za-z]+([.-][0-9A-Za-z]+)*)?$ ]]; then
  die '版本号格式应为 v0.0.3、0.0.3 或 v0.0.3-beta.1'
fi
for PART in "${BASH_REMATCH[1]}" "${BASH_REMATCH[2]}" "${BASH_REMATCH[3]}"; do
  if [[ ${#PART} -gt 5 ]] || (( 10#$PART > 65535 )); then
    die '为兼容 Windows，版本号的每一段不能超过 65535'
  fi
done

RELEASE_TAG="v${RELEASE_VERSION}"
COMMIT_MESSAGE="${2:-Release ${RELEASE_TAG}}"
REMOTE="${RELEASE_REMOTE:-origin}"
git rev-parse --git-dir >/dev/null 2>&1 || die '当前目录不是 Git 仓库'
BRANCH="$(git symbolic-ref --quiet --short HEAD)" || die '当前处于 detached HEAD，请先切换到发布分支'
git remote get-url "${REMOTE}" >/dev/null 2>&1 || die "未配置远端 ${REMOTE}"
[[ -z "$(git diff --name-only --diff-filter=U)" ]] || die '请先解决合并冲突'

# 本项目的本地签名文件不能进入提交。
git check-ignore --quiet key/ || die 'key/ 尚未被 Git 忽略，请先修正 .gitignore'
[[ -z "$(git ls-files -- key/)" ]] || die 'key/ 中存在已跟踪文件，请先从 Git 索引移除'

printf '检查远端版本和分支…\n'
REMOTE_TAG="$(git ls-remote --tags "${REMOTE}" "refs/tags/${RELEASE_TAG}")"
[[ -z "$REMOTE_TAG" ]] || die "远端已存在 ${RELEASE_TAG}，请使用新版本号"
REMOTE_BRANCH="$(git ls-remote --heads "${REMOTE}" "refs/heads/${BRANCH}")"
if [[ -n "$REMOTE_BRANCH" ]]; then
  git fetch --no-tags "${REMOTE}" "${BRANCH}"
  git merge-base --is-ancestor FETCH_HEAD HEAD || die "本地分支落后或已分叉，请先同步 ${REMOTE}/${BRANCH}"
fi

if git show-ref --verify --quiet "refs/tags/${RELEASE_TAG}"; then
  # 上次网络失败时允许重试同一提交；从不覆盖或移动 tag。
  [[ -z "$(git status --porcelain)" ]] || die "本地已有 ${RELEASE_TAG}，且工作区存在修改；请使用新版本号"
  [[ "$(git rev-parse "${RELEASE_TAG}^{commit}")" == "$(git rev-parse HEAD)" ]] || die "本地 ${RELEASE_TAG} 指向其他提交，请使用新版本号"
  printf '重试推送本地 tag：%s\n' "${RELEASE_TAG}"
else
  if [[ -n "$(git status --porcelain)" ]]; then
    git add -A
    if ! git diff --cached --quiet; then
      git commit -m "$COMMIT_MESSAGE"
    fi
  fi
  git tag -a "${RELEASE_TAG}" -m "$COMMIT_MESSAGE"
fi

# GitHub 支持原子推送：分支和 tag 同时成功，才触发该版本构建。
git push --atomic "${REMOTE}" "HEAD:refs/heads/${BRANCH}" "refs/tags/${RELEASE_TAG}:refs/tags/${RELEASE_TAG}"
printf '\n已推送 %s，GitHub Actions 将自动构建 Android、iOS、Windows 和 macOS。\n' "${RELEASE_TAG}"
printf '构建进度：https://github.com/zzxap/chinesechess/actions\n'
