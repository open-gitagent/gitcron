#!/usr/bin/env bash
set -euo pipefail

INPUT=$(cat)

ACTION=$(echo "$INPUT" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(d.action||'')")
TITLE=$(echo "$INPUT" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(d.title||'')")
ID=$(echo "$INPUT" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(d.id||'')")
STATE=$(echo "$INPUT" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(d.state||'')")
PRIORITY=$(echo "$INPUT" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(d.priority||'medium')")
ASSIGNEE=$(echo "$INPUT" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(d.assignee||'')")
FILTER=$(echo "$INPUT" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(d.filter_state||'')")

case "$ACTION" in
  create)
    if [ -z "$TITLE" ]; then
      echo "Error: title is required for create"
      exit 1
    fi
    CMD="gitcron task create \"$TITLE\" --priority $PRIORITY"
    if [ -n "$ASSIGNEE" ]; then
      CMD="$CMD --assignee \"$ASSIGNEE\""
    fi
    eval "$CMD" 2>&1
    ;;
  list)
    if [ -n "$FILTER" ]; then
      gitcron task list --state "$FILTER" 2>&1
    else
      gitcron task list 2>&1
    fi
    ;;
  update)
    if [ -z "$ID" ]; then
      echo "Error: id is required for update"
      exit 1
    fi
    CMD="gitcron task update $ID"
    if [ -n "$STATE" ]; then
      CMD="$CMD --state $STATE"
    fi
    if [ -n "$ASSIGNEE" ]; then
      CMD="$CMD --assignee \"$ASSIGNEE\""
    fi
    eval "$CMD" 2>&1
    ;;
  show)
    if [ -z "$ID" ]; then
      echo "Error: id is required for show"
      exit 1
    fi
    gitcron task show "$ID" 2>&1
    ;;
  *)
    echo "Unknown action: $ACTION. Use: create, list, update, show"
    exit 1
    ;;
esac
