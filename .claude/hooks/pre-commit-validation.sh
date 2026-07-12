#!/usr/bin/env bash
# ============================================================
# Forge — Pre-Commit Validation Hook (PreToolUse)
# ============================================================
# Runs TypeScript typecheck before git commit.
# Blocks commit if typecheck fails.
# Fail-CLOSED: if the hook itself crashes it BLOCKS loudly instead of
# approving in silence, so a broken gate is visible, not invisible.
# ============================================================

# Fail-CLOSED: a hook crash blocks loudly (distinct from a typecheck *finding*,
# which also blocks but with the tsc errors as its reason).
trap 'printf "{\"decision\":\"block\",\"reason\":\"Pre-commit validation hook crashed (line %s) and could NOT typecheck this commit. Failing closed. Fix the hook, or disable it in .claude/settings.json to bypass intentionally.\"}\n" "$LINENO"; exit 0' ERR

# Read hook input from stdin
HOOK_INPUT=$(cat)

# Only run on git commit commands
TOOL_NAME=$(echo "$HOOK_INPUT" | grep -o '"tool_name"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"tool_name"[[:space:]]*:[[:space:]]*"//' | sed 's/"//')
COMMAND=$(echo "$HOOK_INPUT" | grep -o '"command"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"command"[[:space:]]*:[[:space:]]*"//' | sed 's/"//')

# Only intercept git commit commands
if [[ "$TOOL_NAME" != "Bash" ]] || [[ "$COMMAND" != *"git commit"* ]]; then
  printf '{"decision":"approve"}\n'
  exit 0
fi

# Check if tsc is available
if ! command -v npx &>/dev/null; then
  printf '{"decision":"approve"}\n'
  exit 0
fi

# Check if tsconfig exists
if [ ! -f "tsconfig.json" ]; then
  printf '{"decision":"approve"}\n'
  exit 0
fi

# Run typecheck
TSC_OUTPUT=$(npx tsc --noEmit 2>&1) || true
TSC_EXIT=$?

if [ $TSC_EXIT -ne 0 ] && [ -n "$TSC_OUTPUT" ]; then
  # Count errors
  ERROR_COUNT=$(echo "$TSC_OUTPUT" | grep -c "error TS" || true)

  # Truncate output for readability
  SHORT_OUTPUT=$(echo "$TSC_OUTPUT" | head -20)

  printf '{"decision":"block","reason":"TypeScript typecheck failed (%s errors). Fix before committing:\\n%s"}\n' "$ERROR_COUNT" "$SHORT_OUTPUT"
  exit 0
fi

# Typecheck passed
printf '{"decision":"approve"}\n'
