#!/usr/bin/env bash
# Cross-compile PomoTime to Windows (NSIS .exe) inside a Docker container.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGE_TAG="${POMOTIME_WIN_IMAGE:-pomotime-winbuild:latest}"
DOCKERFILE="${REPO_ROOT}/docker/windows-build.Dockerfile"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required but not found in PATH." >&2
  exit 1
fi

echo "==> Building image ${IMAGE_TAG}"
docker build -f "${DOCKERFILE}" -t "${IMAGE_TAG}" "${REPO_ROOT}"

# Cache Cargo registry + npm cache across runs.
CACHE_VOL_CARGO="pomotime-winbuild-cargo"
CACHE_VOL_NPM="pomotime-winbuild-npm"
CACHE_VOL_XWIN="pomotime-winbuild-xwin"

echo "==> Cross-compiling Windows NSIS installer"
docker run --rm \
  -v "${REPO_ROOT}:/work" \
  -v "${CACHE_VOL_CARGO}:/usr/local/cargo/registry" \
  -v "${CACHE_VOL_NPM}:/root/.npm" \
  -v "${CACHE_VOL_XWIN}:/root/.cache/cargo-xwin" \
  -w /work \
  "${IMAGE_TAG}" \
  bash -c '
    set -euo pipefail
    npm ci
    npm run build:web
    cargo tauri build \
      --runner cargo-xwin \
      --target x86_64-pc-windows-msvc \
      --bundles nsis
  '

OUT_DIR="${REPO_ROOT}/src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis"
if [[ -d "${OUT_DIR}" ]]; then
  echo
  echo "NSIS installer(s) produced in:"
  echo "  ${OUT_DIR}"
  ls -1 "${OUT_DIR}"
else
  echo "Expected NSIS output directory not found: ${OUT_DIR}" >&2
  exit 1
fi
