#!/usr/bin/env bash
set -uo pipefail

# Runs Android lint on the debug variant and writes the gradle output plus the
# lint text report to android/logs/lint.log. Extra args are passed to gradle.
# Intended to run inside the container built from docker/Dockerfile.android.build.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ANDROID_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG="$ANDROID_DIR/logs/lint.log"
REPORT="$ANDROID_DIR/app/build/reports/lint-results-debug.txt"

cd "$ANDROID_DIR"
mkdir -p "$(dirname "$LOG")"
rm -f "$REPORT"

echo "# lint $(date -Is) $(git rev-parse --short HEAD 2>/dev/null)" >"$LOG"

# The Go library isn't needed for lint, so skip cross-compiling it.
gradle --console=plain :app:lintDebug -x buildGoServerLibrary "$@" 2>&1 | tee -a "$LOG"
status=${PIPESTATUS[0]}

if [[ -f "$REPORT" ]]; then
    {
        echo
        echo "===== lint report ====="
        cat "$REPORT"
    } >>"$LOG"
fi

echo "# exit status: $status" >>"$LOG"
echo "==> Wrote $LOG"
exit "$status"
