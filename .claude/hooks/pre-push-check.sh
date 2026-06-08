#!/bin/bash
# Pre-push check: scan for internal files that should NOT be in the repo
# Reads git ls-files, checks against known internal file patterns.

INTERNAL=$(git ls-files | grep -E 'CLAUDE\.md$|\.spec$|electron-builder|\.mcp\.json$|\.vscode/|\.DS_Store|keygen\.py|saisika/' 2>/dev/null)

if [ -n "$INTERNAL" ]; then
  echo "{\"systemMessage\": \"PUSH BLOCKED: Internal files detected:\\n$INTERNAL\\n\\nRemove or .gitignore these before pushing.\", \"continue\": false, \"stopReason\": \"Internal files found in tracked files\"}"
  exit 2
fi

echo "{}"
exit 0
