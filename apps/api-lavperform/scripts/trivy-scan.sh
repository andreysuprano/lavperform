#!/usr/bin/env bash
set -euo pipefail

# Cache and report locations
CACHE_DIR="${TRIVY_CACHE_DIR:-$PWD/.trivy-cache}"
REPORT_DIR="${TRIVY_REPORT_DIR:-$PWD/reports/trivy}"
TARGET_DIR="${TRIVY_TARGET_DIR:-$PWD}"
SEVERITY="${TRIVY_SEVERITY:-HIGH,CRITICAL}"
SCANNERS="${TRIVY_SCANNERS:-vuln,license}"
EXIT_CODE="${TRIVY_EXIT_CODE:-1}"
INCLUDE_DEV="${TRIVY_INCLUDE_DEV_DEPS:-false}"
SKIP_DIRS="${TRIVY_SKIP_DIRS:-/src/dist,/src/coverage}"

mkdir -p "$CACHE_DIR" "$REPORT_DIR"

ADDITIONAL_ARGS=()
if [[ -n "${TRIVY_ADDITIONAL_ARGS:-}" ]]; then
  # shellcheck disable=SC2206
  ADDITIONAL_ARGS=(${TRIVY_ADDITIONAL_ARGS})
fi

if [[ "${TRIVY_IGNORE_UNFIXED:-true}" == "true" ]]; then
  ADDITIONAL_ARGS+=(--ignore-unfixed)
fi

JSON_REPORT=/report/trivy-report.json
TABLE_REPORT=/report/trivy-report.txt

# JSON report for CI or tooling consumption. Capture exit to allow the table report to be produced.
set +e
docker run --rm \
  -v "$TARGET_DIR":/src \
  -v "$CACHE_DIR":/root/.cache/trivy \
  -v "$REPORT_DIR":/report \
  aquasec/trivy:latest fs /src \
  --scanners "$SCANNERS" \
  --severity "$SEVERITY" \
  --skip-dirs "$SKIP_DIRS" \
  --format json \
  --output "$JSON_REPORT" \
  --exit-code "$EXIT_CODE" \
  --cache-dir /root/.cache/trivy \
  $( [[ "$INCLUDE_DEV" == "true" ]] && echo --include-dev-deps ) \
  "${ADDITIONAL_ARGS[@]}"
SCAN_EXIT=$?
set -e

# Human-readable summary that does not affect exit status
docker run --rm \
  -v "$TARGET_DIR":/src \
  -v "$CACHE_DIR":/root/.cache/trivy \
  -v "$REPORT_DIR":/report \
  aquasec/trivy:latest fs /src \
  --scanners "$SCANNERS" \
  --severity "$SEVERITY" \
  --skip-dirs "$SKIP_DIRS" \
  --format table \
  --output "$TABLE_REPORT" \
  --exit-code 0 \
  --cache-dir /root/.cache/trivy \
  $( [[ "$INCLUDE_DEV" == "true" ]] && echo --include-dev-deps ) \
  "${ADDITIONAL_ARGS[@]}"

exit "$SCAN_EXIT"
