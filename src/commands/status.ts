import { Command } from 'commander';
import { existsSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { loadCronConfig } from '../utils/loader.js';
import { listTasks } from '../task/store.js';
import { error, heading, label, divider, info, success } from '../utils/format.js';

interface StatusOptions {
  dir: string;
}

export const statusCommand = new Command('status')
  .description('Show gitcron status overview')
  .option('-d, --dir <dir>', 'Directory containing cron.yaml', '.')
  .action((options: StatusOptions) => {
    const dir = resolve(options.dir);

    let config;
    try {
      config = loadCronConfig(dir);
    } catch (e) {
      error((e as Error).message);
      process.exit(1);
    }

    heading('gitcron status');
    divider();

    // Schedules summary
    const schedules = config.schedules || [];
    const enabledSchedules = schedules.filter(s => s.enabled !== false);
    label('Schedules', `${enabledSchedules.length} enabled / ${schedules.length} total`);

    // Tasks summary
    const tasksDir = config.tasks?.directory
      ? resolve(dir, config.tasks.directory)
      : resolve(dir, '.gitcron/tasks');
    const tasks = listTasks(tasksDir);

    if (tasks.length > 0) {
      const stateCounts: Record<string, number> = {};
      for (const t of tasks) {
        stateCounts[t.state] = (stateCounts[t.state] || 0) + 1;
      }
      const stateStr = Object.entries(stateCounts)
        .map(([s, c]) => `${s}: ${c}`)
        .join(', ');
      label('Tasks', `${tasks.length} total (${stateStr})`);
    } else {
      label('Tasks', '0');
    }

    // Reminders summary
    const reminders = config.reminders || [];
    const recurring = reminders.filter(r => r.type === 'recurring' && r.enabled !== false);
    const oneShot = reminders.filter(r => r.type === 'one-shot' && r.enabled !== false);
    label('Reminders', `${recurring.length} recurring, ${oneShot.length} one-shot`);

    // Workflow files status
    const workflowDir = join(dir, config.settings?.workflow_dir || '.github/workflows');
    const prefix = config.settings?.workflow_prefix || 'gitcron-';
    if (existsSync(workflowDir)) {
      const wfFiles = readdirSync(workflowDir).filter(f => f.startsWith(prefix));
      label('Workflow files', `${wfFiles.length} in ${config.settings?.workflow_dir || '.github/workflows'}`);
    } else {
      label('Workflow files', 'not generated yet');
    }

    divider();
    if (enabledSchedules.length > 0 || recurring.length > 0) {
      success('gitcron is configured');
    } else {
      info('No active schedules or reminders. Run `gitcron init` to get started.');
    }
  });
