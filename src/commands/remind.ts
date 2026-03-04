import { Command } from 'commander';
import { writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { execSync } from 'node:child_process';
import yaml from 'js-yaml';
import { loadCronConfig, type CronConfig, type Reminder } from '../utils/loader.js';
import { validateCronExpression } from '../utils/cron.js';
import { success, error, info, heading, table } from '../utils/format.js';

interface RemindCreateOptions {
  cron: string;
  action: string;
  title?: string;
  body?: string;
  dir: string;
}

interface RemindListOptions {
  dir: string;
}

interface RemindFireOptions {
  dir: string;
}

interface RemindToggleOptions {
  dir: string;
}

function saveCronConfig(dir: string, config: CronConfig): void {
  const cronPath = join(resolve(dir), 'cron.yaml');
  writeFileSync(cronPath, yaml.dump(config, { lineWidth: -1, noRefs: true }), 'utf-8');
}

export const remindCommand = new Command('remind')
  .description('Manage gitcron reminders');

remindCommand
  .command('create <name>')
  .description('Create a new recurring reminder')
  .requiredOption('-c, --cron <expr>', 'Cron expression')
  .option('-a, --action <type>', 'Action type (issue)', 'issue')
  .option('--title <title>', 'Issue/notification title')
  .option('--body <body>', 'Issue/notification body')
  .option('-d, --dir <dir>', 'Project directory', '.')
  .action((name: string, options: RemindCreateOptions) => {
    const dir = resolve(options.dir);

    // Validate cron
    const cronResult = validateCronExpression(options.cron);
    if (!cronResult.valid) {
      error(`Invalid cron expression: ${cronResult.errors.join(', ')}`);
      process.exit(1);
    }

    // Validate name is kebab-case
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(name)) {
      error('Reminder name must be kebab-case (e.g., weekly-review)');
      process.exit(1);
    }

    let config;
    try {
      config = loadCronConfig(dir);
    } catch (e) {
      error((e as Error).message);
      process.exit(1);
    }

    if (!config.reminders) {
      config.reminders = [];
    }

    if (config.reminders.some(r => r.name === name)) {
      error(`Reminder "${name}" already exists`);
      process.exit(1);
    }

    const reminder: Reminder = {
      name,
      type: 'recurring',
      cron: options.cron,
      action: {
        type: options.action,
        title: options.title || name,
        body: options.body,
      },
    };

    config.reminders.push(reminder);
    saveCronConfig(dir, config);
    success(`Created reminder: ${name}`);
    info('Run `gitcron generate` to update workflow files.');
  });

remindCommand
  .command('list')
  .description('List all reminders')
  .option('-d, --dir <dir>', 'Project directory', '.')
  .action((options: RemindListOptions) => {
    const dir = resolve(options.dir);

    let config;
    try {
      config = loadCronConfig(dir);
    } catch (e) {
      error((e as Error).message);
      process.exit(1);
    }

    const reminders = config.reminders || [];
    if (reminders.length === 0) {
      info('No reminders defined.');
      return;
    }

    heading('Reminders');
    table(
      ['Name', 'Type', 'Schedule', 'Action', 'Enabled'],
      reminders.map(r => [
        r.name,
        r.type,
        r.type === 'recurring' ? r.cron! : r.at || '-',
        r.action.type,
        r.enabled === false ? 'no' : 'yes',
      ])
    );
  });

remindCommand
  .command('fire <name>')
  .description('Manually fire a reminder action')
  .option('-d, --dir <dir>', 'Project directory', '.')
  .action((name: string, options: RemindFireOptions) => {
    const dir = resolve(options.dir);

    let config;
    try {
      config = loadCronConfig(dir);
    } catch (e) {
      error((e as Error).message);
      process.exit(1);
    }

    const reminder = (config.reminders || []).find(r => r.name === name);
    if (!reminder) {
      error(`Reminder "${name}" not found`);
      process.exit(1);
    }

    if (reminder.action.type === 'issue') {
      const title = reminder.action.title || name;
      const body = reminder.action.body || '';
      const labels = reminder.action.labels || [];
      const assignees = reminder.action.assignees || [];

      const labelFlags = labels.map(l => `--label "${l}"`).join(' ');
      const assigneeFlags = assignees.map(a => `--assignee "${a}"`).join(' ');
      const cmd = `gh issue create --title "${title}" --body "${body}" ${labelFlags} ${assigneeFlags}`.trim();

      info(`Executing: ${cmd}`);
      try {
        execSync(cmd, { cwd: dir, stdio: 'inherit' });
        success(`Reminder "${name}" fired successfully.`);
      } catch {
        error(`Failed to fire reminder "${name}". Is the gh CLI installed and authenticated?`);
        process.exit(1);
      }
    } else {
      error(`Action type "${reminder.action.type}" is not supported for manual firing.`);
      process.exit(1);
    }
  });

remindCommand
  .command('pause <name>')
  .description('Pause a reminder')
  .option('-d, --dir <dir>', 'Project directory', '.')
  .action((name: string, options: RemindToggleOptions) => {
    toggleReminder(options.dir, name, false);
  });

remindCommand
  .command('resume <name>')
  .description('Resume a paused reminder')
  .option('-d, --dir <dir>', 'Project directory', '.')
  .action((name: string, options: RemindToggleOptions) => {
    toggleReminder(options.dir, name, true);
  });

function toggleReminder(dirOpt: string, name: string, enabled: boolean): void {
  const dir = resolve(dirOpt);

  let config;
  try {
    config = loadCronConfig(dir);
  } catch (e) {
    error((e as Error).message);
    process.exit(1);
  }

  const reminder = (config.reminders || []).find(r => r.name === name);
  if (!reminder) {
    error(`Reminder "${name}" not found`);
    process.exit(1);
  }

  reminder.enabled = enabled;
  saveCronConfig(dir, config);
  success(`Reminder "${name}" ${enabled ? 'resumed' : 'paused'}.`);
  info('Run `gitcron generate` to update workflow files.');
}

