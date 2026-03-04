import { Command } from 'commander';
import { resolve } from 'node:path';
import { loadCronConfig } from '../utils/loader.js';
import { readTask, writeTask, listTasks, type Task } from '../task/store.js';
import { generateTaskId } from '../task/id-generator.js';
import { validateTransition, getStates } from '../task/state-machine.js';
import { gitAdd, gitCommit, isGitRepo } from '../utils/git.js';
import { success, error, info, heading, label, divider, table } from '../utils/format.js';

interface TaskCreateOptions {
  priority?: string;
  assignee?: string;
  label?: string[];
  dir: string;
}

interface TaskListOptions {
  state?: string;
  dir: string;
}

interface TaskUpdateOptions {
  state?: string;
  assignee?: string;
  dir: string;
}

interface TaskShowOptions {
  dir: string;
}

function getTasksDir(dir: string): string {
  try {
    const config = loadCronConfig(dir);
    return config.tasks?.directory
      ? resolve(dir, config.tasks.directory)
      : resolve(dir, '.gitcron/tasks');
  } catch {
    return resolve(dir, '.gitcron/tasks');
  }
}

function getTasksConfig(dir: string) {
  try {
    const config = loadCronConfig(dir);
    return config.tasks;
  } catch {
    return undefined;
  }
}

function commitTaskChange(dir: string, filePath: string, message: string, settings?: { name: string; email: string }): void {
  if (!isGitRepo(dir)) return;
  try {
    gitAdd([filePath], dir);
    gitCommit(message, dir, settings);
  } catch {
    // Not in git repo or git not available — skip
  }
}

export const taskCommand = new Command('task')
  .description('Manage gitcron tasks');

taskCommand
  .command('create <title>')
  .description('Create a new task')
  .option('-p, --priority <priority>', 'Priority (low, medium, high)', 'medium')
  .option('-a, --assignee <assignee>', 'Assignee')
  .option('-l, --label <label...>', 'Labels')
  .option('-d, --dir <dir>', 'Project directory', '.')
  .action((title: string, options: TaskCreateOptions) => {
    const dir = resolve(options.dir);
    const tasksDir = getTasksDir(dir);
    const id = generateTaskId(tasksDir);
    const now = new Date().toISOString();

    const task: Task = {
      id,
      title,
      state: 'pending',
      priority: options.priority,
      created_at: now,
      updated_at: now,
      assignee: options.assignee,
      labels: options.label,
      history: [
        { state: 'pending', at: now, by: 'gitcron task create' },
      ],
    };

    const filePath = writeTask(tasksDir, task);
    success(`Created ${id}: ${title}`);

    let commitAuthor;
    try {
      const config = loadCronConfig(dir);
      if (config.settings?.commit_author) {
        commitAuthor = config.settings.commit_author;
      }
    } catch { /* ignore */ }

    commitTaskChange(dir, filePath, `gitcron: create ${id} — ${title}`, commitAuthor);
  });

taskCommand
  .command('list')
  .description('List tasks')
  .option('-s, --state <state>', 'Filter by state')
  .option('-d, --dir <dir>', 'Project directory', '.')
  .action((options: TaskListOptions) => {
    const dir = resolve(options.dir);
    const tasksDir = getTasksDir(dir);
    let tasks = listTasks(tasksDir);

    if (options.state) {
      tasks = tasks.filter(t => t.state === options.state);
    }

    if (tasks.length === 0) {
      info('No tasks found.');
      return;
    }

    heading('Tasks');
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
  });

taskCommand
  .command('update <id>')
  .description('Update a task')
  .option('-s, --state <state>', 'New state')
  .option('-a, --assignee <assignee>', 'New assignee')
  .option('-d, --dir <dir>', 'Project directory', '.')
  .action((id: string, options: TaskUpdateOptions) => {
    const dir = resolve(options.dir);
    const tasksDir = getTasksDir(dir);
    const tasksConfig = getTasksConfig(dir);

    let task;
    try {
      task = readTask(tasksDir, id);
    } catch (e) {
      error((e as Error).message);
      process.exit(1);
    }

    if (options.state) {
      const result = validateTransition(task.state, options.state, tasksConfig);
      if (!result.valid) {
        error(result.error!);
        process.exit(1);
      }

      const now = new Date().toISOString();
      const oldState = task.state;
      task.state = options.state;
      task.updated_at = now;
      task.history.push({
        state: options.state,
        at: now,
        by: 'gitcron task update',
      });

      const filePath = writeTask(tasksDir, task);
      success(`${id}: ${oldState} → ${options.state}`);

      let commitAuthor;
      try {
        const config = loadCronConfig(dir);
        if (config.settings?.commit_author) {
          commitAuthor = config.settings.commit_author;
        }
      } catch { /* ignore */ }

      commitTaskChange(dir, filePath, `gitcron: task ${id} ${oldState} → ${options.state}`, commitAuthor);
    }

    if (options.assignee) {
      task.assignee = options.assignee;
      task.updated_at = new Date().toISOString();
      const filePath = writeTask(tasksDir, task);
      success(`${id}: assigned to ${options.assignee}`);

      commitTaskChange(dir, filePath, `gitcron: task ${id} assigned to ${options.assignee}`);
    }
  });

taskCommand
  .command('show <id>')
  .description('Show task details')
  .option('-d, --dir <dir>', 'Project directory', '.')
  .action((id: string, options: TaskShowOptions) => {
    const dir = resolve(options.dir);
    const tasksDir = getTasksDir(dir);

    let task;
    try {
      task = readTask(tasksDir, id);
    } catch (e) {
      error((e as Error).message);
      process.exit(1);
    }

    heading(task.title);
    divider();
    label('ID', task.id);
    label('State', task.state);
    label('Priority', task.priority || '-');
    label('Assignee', task.assignee || '-');
    label('Created', task.created_at);
    label('Updated', task.updated_at);

    if (task.labels && task.labels.length > 0) {
      label('Labels', task.labels.join(', '));
    }
    if (task.description) {
      label('Description', task.description);
    }

    if (task.history.length > 0) {
      heading('History');
      for (const entry of task.history) {
        info(`  ${entry.at} — ${entry.state} (by ${entry.by})`);
      }
    }
  });
