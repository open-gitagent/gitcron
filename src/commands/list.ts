import { Command } from 'commander';
import { resolve } from 'node:path';
import { loadCronConfig } from '../utils/loader.js';
import { listTasks } from '../task/store.js';
import { describeCron } from '../utils/cron.js';
import { error, heading, table, divider, info } from '../utils/format.js';

interface ListOptions {
  dir: string;
  schedules: boolean;
  tasks: boolean;
  reminders: boolean;
  all: boolean;
}

export const listCommand = new Command('list')
  .description('List schedules, tasks, and reminders')
  .option('-d, --dir <dir>', 'Directory containing cron.yaml', '.')
  .option('--schedules', 'Show schedules only', false)
  .option('--tasks', 'Show tasks only', false)
  .option('--reminders', 'Show reminders only', false)
  .option('-a, --all', 'Show everything', false)
  .action((options: ListOptions) => {
    const dir = resolve(options.dir);
    const showAll = options.all || (!options.schedules && !options.tasks && !options.reminders);

    let config;
    try {
      config = loadCronConfig(dir);
    } catch (e) {
      error((e as Error).message);
      process.exit(1);
    }

    if (showAll || options.schedules) {
      heading('Schedules');
      if (config.schedules && config.schedules.length > 0) {
        table(
          ['Name', 'Cron', 'Type', 'Strategy', 'Enabled'],
          config.schedules.map(s => [
            s.name,
            describeCron(s.cron),
            s.agent ? 'agent' : 'command',
            s.branch?.strategy || 'none',
            s.enabled === false ? 'no' : 'yes',
          ])
        );
      } else {
        info('No schedules defined.');
      }
    }

    if (showAll || options.tasks) {
      heading('Tasks');
      const tasksDir = config.tasks?.directory
        ? resolve(dir, config.tasks.directory)
        : resolve(dir, '.gitcron/tasks');
      const tasks = listTasks(tasksDir);
      if (tasks.length > 0) {
        table(
          ['ID', 'Title', 'State', 'Priority', 'Assignee'],
          tasks.map(t => [
            t.id,
            t.title.length > 40 ? t.title.slice(0, 37) + '...' : t.title,
            t.state,
            t.priority || '-',
            t.assignee || '-',
          ])
        );
      } else {
        info('No tasks found.');
      }
    }

    if (showAll || options.reminders) {
      heading('Reminders');
      if (config.reminders && config.reminders.length > 0) {
        table(
          ['Name', 'Type', 'Schedule', 'Action', 'Enabled'],
          config.reminders.map(r => [
            r.name,
            r.type,
            r.type === 'recurring' ? describeCron(r.cron!) : r.at || '-',
            r.action.type,
            r.enabled === false ? 'no' : 'yes',
          ])
        );
      } else {
        info('No reminders defined.');
      }
    }
  });
