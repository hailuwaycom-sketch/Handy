#!/usr/bin/env bash
# ============================================================
# Forge — Security Scan Hook (PreToolUse)
# ============================================================
# Scans staged files before git commit for:
#   1. Hardcoded secrets (API keys, tokens, passwords)
#   2. Debug statements (console.log with sensitive data, debugger)
#   3. CORS wildcard (Access-Control-Allow-Origin: *)
#   4. Dangerous patterns (eval, innerHTML without sanitization)
#
# BLOCKS on: hardcoded secrets (critical risk)
# WARNS on: debug statements, CORS wildcard (logged but not blocking)
# Fail-CLOSED: if the hook itself crashes it BLOCKS (never approves in
# silence). A security guard that fails must fail loud -- a silent approve
# gives false confidence that secrets were scanned when they were not.
# ============================================================

LOG_FILE=".claude/logs/security-scan.log"

log() {
  mkdir -p "$(dirname "$LOG_FILE")"
  echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] $*" >> "$LOG_FILE"
}

# Fail-CLOSED: distinguish a *finding* (real secret -> block w/ reason) from
# an *infra error of the hook itself* -> also block, but say so, so it is
# fixable and never approved silently.
trap 'log "INFRA ERROR: hook aborted at line $LINENO -- failing closed"; printf "{\"decision\":\"block\",\"reason\":\"Security scan hook crashed (line %s) and could NOT verify this commit. Failing closed: the commit was NOT scanned for secrets. Fix the hook, or temporarily disable it in .claude/settings.json to bypass intentionally.\"}\n" "$LINENO"; exit 0' ERR

# Read hook input from stdin
HOOK_INPUT=$(cat)

# Only run on git commit commands
TOOL_NAME=$(echo "$HOOK_INPUT" | grep -o '"tool_name"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"tool_name"[[:space:]]*:[[:space:]]*"//' | sed 's/"//')
COMMAND=$(echo "$HOOK_INPUT" | grep -o '"command"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"command"[[:space:]]*:[[:space:]]*"//' | sed 's/"//')

if [[ "$TOOL_NAME" != "Bash" ]] || [[ "$COMMAND" != *"git commit"* ]]; then
  printf '{"decision":"approve"}\n'
  exit 0
fi

# Get staged files (only text files)
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM 2>/dev/null) || true

if [ -z "$STAGED_FILES" ]; then
  printf '{"decision":"approve"}\n'
  exit 0
fi

SECRETS_FOUND=""
WARNINGS=""

# Scan each staged file
while IFS= read -r file; do
  # Skip binary files, lock files, and non-source files
  case "$file" in
    *.lock|*.png|*.jpg|*.ico|*.woff*|*.ttf|*.eot|*.svg|node_modules/*|.git/*)
      continue
      ;;
  esac

  # Skip if file doesn't exist
  [ -f "$file" ] || continue

  # Get staged content (what will actually be committed)
  CONTENT=$(git show ":$file" 2>/dev/null) || continue

  # === CRITICAL: Hardcoded Secrets ===

  # AWS keys
  if echo "$CONTENT" | grep -qE 'AKIA[0-9A-Z]{16}'; then
    SECRETS_FOUND="${SECRETS_FOUND}  ⛔ AWS Access Key in $file\n"
  fi

  # Generic API keys/tokens (sk-*, pk_live_*, sk_live_*, etc.)
  if echo "$CONTENT" | grep -qE '(sk-[a-zA-Z0-9]{20,}|pk_live_[a-zA-Z0-9]+|sk_live_[a-zA-Z0-9]+|sk_test_[a-zA-Z0-9]+)'; then
    SECRETS_FOUND="${SECRETS_FOUND}  ⛔ API key/token pattern in $file\n"
  fi

  # Hardcoded passwords/secrets in assignments
  if echo "$CONTENT" | grep -qEi '(password|secret|api_key|apikey|access_token|private_key)[[:space:]]*[=:][[:space:]]*["\x27][^"\x27]{8,}'; then
    # Exclude common false positives (env var references, placeholder patterns)
    if ! echo "$CONTENT" | grep -qE '(process\.env|YOUR_|CHANGE_ME|example|placeholder|<.*>)'; then
      SECRETS_FOUND="${SECRETS_FOUND}  ⛔ Possible hardcoded secret in $file\n"
    fi
  fi

  # Supabase service role key (should never be in client code)
  if echo "$CONTENT" | grep -qE 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+'; then
    # Only flag if it's not in an env file
    case "$file" in
      *.env*) ;; # env files are OK (but should be in .gitignore)
      *) SECRETS_FOUND="${SECRETS_FOUND}  ⛔ JWT token (possibly Supabase service key) in $file\n" ;;
    esac
  fi

  # === WARNINGS: Debug & Config Issues ===

  # Console.log with sensitive variable names
  if echo "$CONTENT" | grep -qEi 'console\.(log|debug|info)\(.*\b(password|token|secret|key|credential|auth|session)\b'; then
    WARNINGS="${WARNINGS}  ⚠️  console.log with sensitive data in $file\n"
  fi

  # Debugger statements
  if echo "$CONTENT" | grep -qE '^\s*debugger\s*;?\s*$'; then
    WARNINGS="${WARNINGS}  ⚠️  debugger statement in $file\n"
  fi

  # CORS wildcard
  if echo "$CONTENT" | grep -qE "Access-Control-Allow-Origin.*['\"]\\*['\"]"; then
    WARNINGS="${WARNINGS}  ⚠️  CORS wildcard (*) in $file\n"
  fi

  # dangerouslySetInnerHTML without sanitization context
  if echo "$CONTENT" | grep -q 'dangerouslySetInnerHTML'; then
    WARNINGS="${WARNINGS}  ⚠️  dangerouslySetInnerHTML usage in $file — verify input is sanitized\n"
  fi

done <<< "$STAGED_FILES"

# === Decision ===

if [ -n "$SECRETS_FOUND" ]; then
  log "BLOCKED: secrets found"
  log "$SECRETS_FOUND"
  MESSAGE="🔒 Security scan found hardcoded secrets:\n${SECRETS_FOUND}"
  if [ -n "$WARNINGS" ]; then
    MESSAGE="${MESSAGE}\nWarnings:\n${WARNINGS}"
  fi
  MESSAGE="${MESSAGE}\nRemove secrets and use environment variables instead."
  printf '{"decision":"block","reason":"%s"}\n' "$(echo -e "$MESSAGE" | tr '\n' ' ' | sed 's/"/\\"/g')"
  exit 0
fi

if [ -n "$WARNINGS" ]; then
  log "APPROVED with warnings"
  log "$WARNINGS"
fi

# All clear
printf '{"decision":"approve"}\n'
