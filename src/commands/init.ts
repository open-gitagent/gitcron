import { Command } from 'commander';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { success, error, info, heading } from '../utils/format.js';
import { MINIMAL_CRON_YAML } from '../templates/minimal.js';
import { STANDARD_CRON_YAML } from '../templates/standard.js';
import { FULL_CRON_YAML } from '../templates/full.js';

interface InitOptions {
  template: string;
  dir: string;
}

function createDir(path: string): void {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

function createFile(path: string, content: string): void {
  writeFileSync(path, content, 'utf-8');
}

export const initCommand = new Command('init')
  .description('Scaffold a new gitcron configuration')
  .option('-t, --template <template>', 'Template to use (minimal, standard, full)', 'standard')
  .option('-d, --dir <dir>', 'Target directory', '.')
  .action((options: InitOptions) => {
    const dir = resolve(options.dir);
    const template = options.template;

    if (existsSync(join(dir, 'cron.yaml'))) {
      error('cron.yaml already exists in this directory');
      process.exit(1);
    }

    heading(`Scaffolding ${template} gitcron`);

    const templates: Record<string, string> = {
      minimal: MINIMAL_CRON_YAML,
      standard: STANDARD_CRON_YAML,
      full: FULL_CRON_YAML,
    };

    const content = templates[template];
    if (!content) {
      error(`Unknown template: ${template}. Use minimal, standard, or full.`);
      process.exit(1);
    }

    createFile(join(dir, 'cron.yaml'), content);
    success('Created cron.yaml');

    // Create .gitcron directory structure
    createDir(join(dir, '.gitcron', 'tasks'));
    success('Created .gitcron/tasks/');

    if (template !== 'minimal') {
      createDir(join(dir, '.github', 'workflows'));
      success('Created .github/workflows/');
    }

    info(`\ngitcron scaffolded at ${dir}`);
    info('Next steps:');
    info('  1. Edit cron.yaml with your schedules');
    info('  2. Run `gitcron validate` to check your configuration');
    info('  3. Run `gitcron generate` to create GitHub Actions workflows');
  });
