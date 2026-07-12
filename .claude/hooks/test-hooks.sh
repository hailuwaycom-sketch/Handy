#!/usr/bin/env bash
# ============================================================
# Forge — Hook smoke tests
# ============================================================
# Mechanical enforcement of the PreToolUse hook contract, so the guards
# can't silently rot back to fail-open (see getforja/forge-pro#3 point 1).
#
# Checks:
#   1. Benign (non-commit) input -> approve   (happy path intact)
#   2. Static: the ERR trap BLOCKS, never approves  (fail-CLOSED, both hooks)
#   3. Functional: a forced crash -> block    (fail-CLOSED at runtime)
#   4. Functional: a planted AKIA secret -> block
#
# Hooks ship with CRLF for Windows/git-bash; we run CR-stripped copies so
# this suite is platform-independent (Linux CI included).
# ============================================================
set -uo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
fail=0

# CR-stripped runnable copy of a hook -> prints its path
runnable() {
  local out="$TMP/$1"
  sed 's/\r$//' "$DIR/$1" > "$out"
  echo "$out"
}

# decision extracted from a hook's JSON stdout (no python dependency)
decision_of() { grep -o '"decision":"[a-z]*"' | head -1 | cut -d'"' -f4; }

check() { # label expected actual
  if [ "$2" = "$3" ]; then echo "  ok  : $1 ($3)"; else echo "  FAIL: $1 — expected '$2', got '$3'"; fail=1; fi
}

SEC="$(runnable security-scan.sh)"
PCV="$(runnable pre-commit-validation.sh)"

echo "[1] happy path — non-commit input approves"
check "security-scan non-commit" approve \
  "$(printf '{"tool_name":"Read","command":"cat x"}' | bash "$SEC" 2>/dev/null | decision_of)"
check "pre-commit-validation non-commit" approve \
  "$(printf '{"tool_name":"Read","command":"cat x"}' | bash "$PCV" 2>/dev/null | decision_of)"

echo "[2] static fail-CLOSED guard — ERR trap must block, never approve"
for h in security-scan.sh pre-commit-validation.sh; do
  trapline="$(grep -E '^trap .*ERR$' "$DIR/$h" || true)"
  if echo "$trapline" | grep -q '\\"decision\\":\\"block\\"' && ! echo "$trapline" | grep -q 'approve'; then
    echo "  ok  : $h ERR trap is fail-CLOSED"
  else
    echo "  FAIL: $h ERR trap is not fail-CLOSED"; fail=1
  fi
done

echo "[3] runtime fail-CLOSED — a forced crash emits block"
crashtrap="$(grep -E '^trap .*ERR$' "$SEC")"
check "security-scan crash blocks" block \
  "$(bash -c "$crashtrap"$'\n''false'$'\n''printf "{\"decision\":\"approve\"}"' 2>/dev/null | decision_of)"

echo "[4] functional — planted AKIA secret blocks the commit"
REPO="$TMP/repo"; mkdir -p "$REPO"
(
  cd "$REPO"
  git init -q
  git config user.email ci@forge.test
  git config user.name ci
  printf 'const key = "AKIA%s";\n' "ABCDEFGHIJKLMNOP" > leak.ts
  git add leak.ts
)
check "security-scan blocks secret" block \
  "$(cd "$REPO" && printf '{"tool_name":"Bash","command":"git commit -m x"}' | bash "$SEC" 2>/dev/null | decision_of)"

echo
if [ "$fail" = 0 ]; then echo "ALL HOOK TESTS PASSED"; else echo "HOOK TESTS FAILED"; exit 1; fi
