#!/usr/bin/env bash
set -euo pipefail

# Read JSON args from stdin
INPUT=$(cat)

ACTION=$(echo "$INPUT" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(d.action||'')")
NAME=$(echo "$INPUT" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(d.name||'')")
CRON_EXPR=$(echo "$INPUT" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(d.cron||'')")
TYPE=$(echo "$INPUT" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(d.type||'')")
AGENT=$(echo "$INPUT" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(d.agent||'')")
ADAPTER=$(echo "$INPUT" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(d.adapter||'claude')")
COMMAND=$(echo "$INPUT" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(d.command||'')")
PROMPT=$(echo "$INPUT" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(d.prompt||'')")
STRATEGY=$(echo "$INPUT" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(d.strategy||'none')")
DESC=$(echo "$INPUT" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(d.description||'')")

case "$ACTION" in
  list)
    gitcron list --schedules 2>&1
    ;;
  create)
    if [ -z "$NAME" ] || [ -z "$CRON_EXPR" ] || [ -z "$TYPE" ]; then
      echo '{"text": "Error: name, cron, and type are required for create"}'
      exit 1
    fi

    # Build the schedule YAML block and append to cron.yaml
    if [ ! -f cron.yaml ]; then
      gitcron init --template minimal 2>&1
    fi

    # Use node to append the schedule to cron.yaml
    node -e "
      const fs = require('fs');
      const yaml = require('js-yaml');
      const config = yaml.load(fs.readFileSync('cron.yaml', 'utf8'));
      if (!config.schedules) config.schedules = [];

      const schedule = {
        name: '$NAME',
        cron: '$CRON_EXPR',
        enabled: true,
      };
      if ('$DESC') schedule.description = '$DESC';
      if ('$TYPE' === 'agent') {
        schedule.agent = '$AGENT' || '$NAME';
        schedule.adapter = '$ADAPTER';
        if ('$PROMPT') schedule.prompt = '$PROMPT';
      } else {
        schedule.command = '$COMMAND';
      }
      if ('$STRATEGY' !== 'none') {
        schedule.branch = { strategy: '$STRATEGY', base: 'main' };
      }

      config.schedules.push(schedule);
      fs.writeFileSync('cron.yaml', yaml.dump(config, { lineWidth: -1, noRefs: true }));
    " 2>&1

    echo "Created schedule '$NAME' with cron '$CRON_EXPR'. Run gitcron generate to update workflows."
    ;;
  enable)
    if [ -z "$NAME" ]; then
      echo '{"text": "Error: name is required"}'
      exit 1
    fi
    node -e "
      const fs = require('fs');
      const yaml = require('js-yaml');
      const config = yaml.load(fs.readFileSync('cron.yaml', 'utf8'));
      const s = (config.schedules || []).find(s => s.name === '$NAME');
      if (!s) { console.log('Schedule $NAME not found'); process.exit(1); }
      s.enabled = true;
      fs.writeFileSync('cron.yaml', yaml.dump(config, { lineWidth: -1, noRefs: true }));
      console.log('Enabled schedule $NAME');
    " 2>&1
    ;;
  disable)
    if [ -z "$NAME" ]; then
      echo '{"text": "Error: name is required"}'
      exit 1
    fi
    node -e "
      const fs = require('fs');
      const yaml = require('js-yaml');
      const config = yaml.load(fs.readFileSync('cron.yaml', 'utf8'));
      const s = (config.schedules || []).find(s => s.name === '$NAME');
      if (!s) { console.log('Schedule $NAME not found'); process.exit(1); }
      s.enabled = false;
      fs.writeFileSync('cron.yaml', yaml.dump(config, { lineWidth: -1, noRefs: true }));
      console.log('Disabled schedule $NAME');
    " 2>&1
    ;;
  *)
    echo "Unknown action: $ACTION. Use: create, list, enable, disable"
    exit 1
    ;;
esac
