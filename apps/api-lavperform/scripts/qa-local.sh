#!/usr/bin/env bash
set -uo pipefail

REPORT_ROOT="${REPORT_ROOT:-$PWD/reports}"
LINT_REPORT_DIR="$REPORT_ROOT/eslint"
SEMGREP_REPORT_DIR="$REPORT_ROOT/semgrep"
COVERAGE_DIR="$REPORT_ROOT/coverage"
TRIVY_REPORT_DIR="$REPORT_ROOT/trivy"

mkdir -p "$LINT_REPORT_DIR" "$SEMGREP_REPORT_DIR" "$COVERAGE_DIR" "$TRIVY_REPORT_DIR"

STEP_RESULTS=()
ANY_FAIL=0

run_step() {
  local name="$1"
  shift
  echo "Running $name..."
  set +e
  "$@"
  local status=$?
  set -e
  STEP_RESULTS+=("$name:$status")
  if [[ $status -ne 0 ]]; then
    ANY_FAIL=1
    echo "$name failed (exit $status), continuing..."
  fi
}

# ESLint (no fixes) -> reports/eslint/eslint.json
run_step "ESLint" npx eslint "{src,apps,libs,test}/**/*.ts" --no-fix --format json --output-file "$LINT_REPORT_DIR/eslint.json"

# Jest coverage -> reports/coverage
run_step "Jest coverage" npm run test:cov -- --coverageDirectory "$COVERAGE_DIR"

# Semgrep -> reports/semgrep/semgrep.json (and log in same folder)
run_step "Semgrep" env SEMGREP_USER_LOG_FILE="$SEMGREP_REPORT_DIR/semgrep.log" npm run semgrep -- --json --output "$SEMGREP_REPORT_DIR/semgrep.json"

# Trivy -> reports/trivy
run_step "Trivy" env TRIVY_REPORT_DIR="$TRIVY_REPORT_DIR" npm run trivy:scan

echo
echo "QA summary (reports under $REPORT_ROOT):"
for entry in "${STEP_RESULTS[@]}"; do
  name="${entry%%:*}"
  status="${entry##*:}"
  if [[ $status -eq 0 ]]; then
    echo "✓ $name"
  else
    echo "✗ $name (exit $status)"
  fi
done

exit $ANY_FAIL
