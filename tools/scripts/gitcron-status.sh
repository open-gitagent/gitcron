#!/usr/bin/env bash
set -euo pipefail

INPUT=$(cat)

ACTION=$(echo "$INPUT" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(d.action||'status')")
DRY_RUN=$(echo "$INPUT" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(d.dry_run?'true':'false')")

case "$ACTION" in
  status)
    gitcron status 2>&1
    echo ""
    gitcron list --all 2>&1
    ;;
  validate)
    gitcron validate 2>&1
    ;;
  generate)
    if [ "$DRY_RUN" = "true" ]; then
      gitcron generate --dry-run 2>&1
    else
      gitcron generate 2>&1
    fi
    ;;
  *)
    echo "Unknown action: $ACTION. Use: status, validate, generate"
    exit 1
    ;;
esac
