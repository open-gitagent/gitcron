#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { generateCommand } from './commands/generate.js';
import { validateCommand } from './commands/validate.js';
import { listCommand } from './commands/list.js';
import { statusCommand } from './commands/status.js';
import { taskCommand } from './commands/task.js';
import { remindCommand } from './commands/remind.js';

const program = new Command();

program
  .name('gitcron')
  .description('Git-native scheduling, tasks, and reminders — cron.yaml to GitHub Actions')
  .version('0.1.0');

program.addCommand(initCommand);
program.addCommand(generateCommand);
program.addCommand(validateCommand);
program.addCommand(listCommand);
program.addCommand(statusCommand);
program.addCommand(taskCommand);
program.addCommand(remindCommand);

program.parse();
