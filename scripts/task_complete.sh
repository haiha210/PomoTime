#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: npm run task:complete -- <TASK_ID> \"<commit message>\""
  exit 1
fi

TASK_ID="$1"
shift
COMMIT_MSG="$*"

if [[ -z "$COMMIT_MSG" ]]; then
  echo "Commit message is required"
  exit 1
fi

echo "[1/5] Running full test suite..."
npm run test:all

echo "[2/5] Staging changes..."
git add -A

if git diff --cached --quiet; then
  echo "No staged changes detected"
  exit 1
fi

echo "[3/5] Creating commit..."
git commit -m "feat(${TASK_ID}): ${COMMIT_MSG}"

echo "[4/5] Pushing to remote..."
git push origin HEAD

echo "[5/5] Done"
