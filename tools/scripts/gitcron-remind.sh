#!/usr/bin/env bash
set -euo pipefail

INPUT=$(cat)

ACTION=$(echo "$INPUT" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(d.action||'')")
NAME=$(echo "$INPUT" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(d.name||'')")
CRON_EXPR=$(echo "$INPUT" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(d.cron||'')")
TITLE=$(echo "$INPUT" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(d.title||'')")
BODY=$(echo "$INPUT" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(d.body||'')")

case "$ACTION" in
  create)
    if [ -z "$NAME" ] || [ -z "$CRON_EXPR" ]; then
      echo "Error: name and cron are required for create"
      exit 1
    fi
    CMD="gitcron remind create \"$NAME\" --cron \"$CRON_EXPR\""
    if [ -n "$TITLE" ]; then
      CMD="$CMD --title \"$TITLE\""
    fi
    if [ -n "$BODY" ]; then
      CMD="$CMD --body \"$BODY\""
    fi
    eval "$CMD" 2>&1
    ;;
  list)
    gitcron remind list 2>&1
    ;;
  fire)
    if [ -z "$NAME" ]; then
      echo "Error: name is required for fire"
      exit 1
    fi
    gitcron remind fire "$NAME" 2>&1
    ;;
  pause)
    if [ -z "$NAME" ]; then
      echo "Error: name is required for pause"
      exit 1
    fi
    gitcron remind pause "$NAME" 2>&1
    ;;
  resume)
    if [ -z "$NAME" ]; then
      echo "Error: name is required for resume"
      exit 1
    fi
    gitcron remind resume "$NAME" 2>&1
    ;;
  *)
    echo "Unknown action: $ACTION. Use: create, list, fire, pause, resume"
    exit 1
    ;;
esac
