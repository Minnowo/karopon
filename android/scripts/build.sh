#!/usr/bin/env bash
set -uo pipefail

# Builds the app (assembleDebug by default) and writes the gradle output to
# android/logs/build.log. Args, if given, replace the default gradle tasks.
# Intended to run inside the container built from docker/Dockerfile.android.build.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ANDROID_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG="$ANDROID_DIR/logs/build.log"

cd "$ANDROID_DIR"
mkdir -p "$(dirname "$LOG")"

if [[ $# -eq 0 ]]; then
    set -- assembleDebug
fi

echo "# build $(date -Is) $(git rev-parse --short HEAD 2>/dev/null) tasks: $*" >"$LOG"

gradle --console=plain "$@" 2>&1 | tee -a "$LOG"
status=${PIPESTATUS[0]}

echo "# exit status: $status" >>"$LOG"
echo "==> Wrote $LOG"
exit "$status"
