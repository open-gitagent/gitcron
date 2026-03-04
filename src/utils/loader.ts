import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import yaml from 'js-yaml';

export interface CronConfig {
  spec_version: string;
  name: string;
  description?: string;
  schedules?: Schedule[];
  tasks?: TasksConfig;
  reminders?: Reminder[];
  settings?: Settings;
}

export interface Schedule {
  name: string;
  description?: string;
  cron: string;
  enabled?: boolean;
  category?: string;
  agent?: string;
  adapter?: string;
  prompt?: string;
  command?: string;
  agent_source?: {
    type: string;
    path?: string;
    repo?: string;
  };
  branch?: {
    strategy: 'pr' | 'create' | 'commit' | 'none';
    base?: string;
    name_template?: string;
    pr_title?: string;
    pr_labels?: string[];
  };
  env?: Record<string, string>;
  secrets?: string[];
  timeout?: number;
  retry?: {
    max_attempts?: number;
  };
  notify?: {
    on_failure?: NotifyAction[];
    on_success?: NotifyAction[];
  };
}

export interface NotifyAction {
  type: string;
  title?: string;
  body?: string;
  labels?: string[];
  assignees?: string[];
}

export interface TasksConfig {
  directory: string;
  states: string[];
  transitions: Record<string, string[]>;
}

export interface Reminder {
  name: string;
  description?: string;
  type: 'recurring' | 'one-shot';
  cron?: string;
  at?: string;
  enabled?: boolean;
  action: {
    type: string;
    title?: string;
    body?: string;
    labels?: string[];
    assignees?: string[];
  };
}

export interface Settings {
  workflow_dir?: string;
  workflow_prefix?: string;
  commit_author?: {
    name: string;
    email: string;
  };
}

export function loadCronConfig(dir: string): CronConfig {
  const cronPath = join(resolve(dir), 'cron.yaml');
  if (!existsSync(cronPath)) {
    throw new Error(`cron.yaml not found in ${resolve(dir)}`);
  }
  const content = readFileSync(cronPath, 'utf-8');
  return yaml.load(content) as CronConfig;
}

export function loadFileIfExists(path: string): string | null {
  if (existsSync(path)) {
    return readFileSync(path, 'utf-8');
  }
  return null;
}

export function loadYamlIfExists<T = unknown>(path: string): T | null {
  const content = loadFileIfExists(path);
  if (content) {
    return yaml.load(content) as T;
  }
  return null;
}

export function cronConfigExists(dir: string): boolean {
  return existsSync(join(resolve(dir), 'cron.yaml'));
}
