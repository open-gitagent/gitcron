import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

export interface Task {
  id: string;
  title: string;
  description?: string;
  state: string;
  priority?: string;
  created_at: string;
  updated_at: string;
  assignee?: string;
  labels?: string[];
  history: TaskHistoryEntry[];
}

export interface TaskHistoryEntry {
  state: string;
  at: string;
  by: string;
}

export function ensureTasksDir(tasksDir: string): void {
  if (!existsSync(tasksDir)) {
    mkdirSync(tasksDir, { recursive: true });
  }
}

export function readTask(tasksDir: string, id: string): Task {
  const filePath = join(tasksDir, `${id}.yaml`);
  if (!existsSync(filePath)) {
    throw new Error(`Task ${id} not found at ${filePath}`);
  }
  const content = readFileSync(filePath, 'utf-8');
  return yaml.load(content) as Task;
}

export function writeTask(tasksDir: string, task: Task): string {
  ensureTasksDir(tasksDir);
  const filePath = join(tasksDir, `${task.id}.yaml`);
  writeFileSync(filePath, yaml.dump(task, { lineWidth: -1, noRefs: true }), 'utf-8');
  return filePath;
}

export function listTasks(tasksDir: string): Task[] {
  if (!existsSync(tasksDir)) return [];

  const files = readdirSync(tasksDir).filter(f => /^TASK-\d+\.yaml$/.test(f));
  return files.map(f => {
    const content = readFileSync(join(tasksDir, f), 'utf-8');
    return yaml.load(content) as Task;
  }).sort((a, b) => a.id.localeCompare(b.id));
}
