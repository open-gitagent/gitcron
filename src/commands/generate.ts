import { Command } from 'commander';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { loadCronConfig } from '../utils/loader.js';
import { generateWorkflows } from '../generators/workflow.js';
import { success, error, warn, info, heading, divider } from '../utils/format.js';

interface GenerateOptions {
  dir: string;
  dryRun: boolean;
  force: boolean;
  diff: boolean;
}

export const generateCommand = new Command('generate')
  .description('Generate GitHub Actions workflow files from cron.yaml')
  .option('-d, --dir <dir>', 'Directory containing cron.yaml', '.')
  .option('--dry-run', 'Print generated files to stdout without writing', false)
  .option('--force', 'Overwrite even if manually modified', false)
  .option('--diff', 'Show unified diff of changes', false)
  .action((options: GenerateOptions) => {
    const dir = resolve(options.dir);

    let config;
    try {
      config = loadCronConfig(dir);
    } catch (e) {
      error((e as Error).message);
      process.exit(1);
    }

    const workflowDir = join(dir, config.settings?.workflow_dir || '.github/workflows');
    const workflows = generateWorkflows(config);

    if (workflows.length === 0) {
      info('No enabled schedules or reminders to generate.');
      return;
    }

    heading(`Generating ${workflows.length} workflow file${workflows.length !== 1 ? 's' : ''}`);

    let written = 0;
    let skipped = 0;

    for (const wf of workflows) {
      const filePath = join(workflowDir, wf.filename);

      if (options.dryRun) {
        divider();
        info(`--- ${wf.filename} (source: ${wf.source}) ---`);
        console.log(wf.content);
        continue;
      }

      // Check if file already exists and was manually modified
      if (existsSync(filePath) && !options.force) {
        const existing = readFileSync(filePath, 'utf-8');
        const hashMatch = existing.match(/^# Hash: (\w+)/m);
        if (hashMatch) {
          if (hashMatch[1] === wf.hash) {
            skipped++;
            info(`${wf.filename} — unchanged, skipping`);
            continue;
          }
          // Hash differs but file has our header — safe to overwrite
        } else {
          warn(`${wf.filename} — no gitcron hash found, may be manually edited. Use --force to overwrite.`);
          skipped++;
          continue;
        }
      }

      if (options.diff && existsSync(filePath)) {
        const existing = readFileSync(filePath, 'utf-8');
        if (existing !== wf.content) {
          info(`Changes for ${wf.filename}:`);
          showSimpleDiff(existing, wf.content);
        }
      }

      mkdirSync(workflowDir, { recursive: true });
      writeFileSync(filePath, wf.content, 'utf-8');
      success(`${wf.filename} — written`);
      written++;
    }

    if (!options.dryRun) {
      divider();
      success(`Generated ${written} file${written !== 1 ? 's' : ''}, ${skipped} skipped`);
    }
  });

function showSimpleDiff(oldText: string, newText: string): void {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const maxLen = Math.max(oldLines.length, newLines.length);

  for (let i = 0; i < maxLen; i++) {
    if (oldLines[i] !== newLines[i]) {
      if (oldLines[i] !== undefined) console.log(`- ${oldLines[i]}`);
      if (newLines[i] !== undefined) console.log(`+ ${newLines[i]}`);
    }
  }
}
