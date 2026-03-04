import { Command } from 'commander';
import { resolve } from 'node:path';
import _Ajv from 'ajv';
import _addFormats from 'ajv-formats';
const Ajv = _Ajv as unknown as typeof _Ajv.default;
const addFormats = _addFormats as unknown as typeof _addFormats.default;
import { loadCronConfig } from '../utils/loader.js';
import { loadSchema } from '../utils/schemas.js';
import { validateCronExpression } from '../utils/cron.js';
import { validateStateMachine } from '../task/state-machine.js';
import { success, error, warn, info, heading, divider } from '../utils/format.js';

interface ValidateOptions {
  dir: string;
  strict: boolean;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function validateSchema(data: unknown): { valid: boolean; errors: string[] } {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const schema = loadSchema('cron-yaml') as Record<string, unknown>;
  delete schema['$schema'];
  delete schema['$id'];
  const validate = ajv.compile(schema);
  const valid = validate(data);
  const errors = validate.errors?.map((e: any) => {
    const path = e.instancePath || '/';
    return `${path}: ${e.message}`;
  }) ?? [];
  return { valid: valid === true, errors };
}

function validateSemantics(dir: string): ValidationResult {
  const result: ValidationResult = { valid: true, errors: [], warnings: [] };

  let config;
  try {
    config = loadCronConfig(dir);
  } catch (e) {
    result.valid = false;
    result.errors.push((e as Error).message);
    return result;
  }

  // Schema validation
  const schemaResult = validateSchema(config);
  if (!schemaResult.valid) {
    result.valid = false;
    result.errors.push(...schemaResult.errors.map(e => `cron.yaml ${e}`));
  }

  // Validate cron expressions in schedules
  if (config.schedules) {
    for (const schedule of config.schedules) {
      const cronResult = validateCronExpression(schedule.cron);
      if (!cronResult.valid) {
        result.valid = false;
        cronResult.errors.forEach(e =>
          result.errors.push(`schedules.${schedule.name}.cron: ${e}`)
        );
      }

      // Warn if agent schedule has no branch strategy
      if (schedule.agent && !schedule.branch) {
        result.warnings.push(
          `schedules.${schedule.name}: agent schedule has no branch strategy (defaults to none)`
        );
      }
    }

    // Check for duplicate schedule names
    const names = config.schedules.map(s => s.name);
    const dupes = names.filter((n, i) => names.indexOf(n) !== i);
    if (dupes.length > 0) {
      result.valid = false;
      result.errors.push(`Duplicate schedule names: ${[...new Set(dupes)].join(', ')}`);
    }
  }

  // Validate task state machine
  if (config.tasks) {
    const smErrors = validateStateMachine(config.tasks);
    if (smErrors.length > 0) {
      result.valid = false;
      smErrors.forEach(e => result.errors.push(`tasks: ${e}`));
    }
  }

  // Validate reminders
  if (config.reminders) {
    for (const reminder of config.reminders) {
      if (reminder.type === 'recurring' && reminder.cron) {
        const cronResult = validateCronExpression(reminder.cron);
        if (!cronResult.valid) {
          result.valid = false;
          cronResult.errors.forEach(e =>
            result.errors.push(`reminders.${reminder.name}.cron: ${e}`)
          );
        }
      }

      if (reminder.type === 'one-shot' && reminder.at) {
        const date = new Date(reminder.at);
        if (isNaN(date.getTime())) {
          result.valid = false;
          result.errors.push(`reminders.${reminder.name}.at: invalid date-time`);
        }
      }
    }

    // Check for duplicate reminder names
    const names = config.reminders.map(r => r.name);
    const dupes = names.filter((n, i) => names.indexOf(n) !== i);
    if (dupes.length > 0) {
      result.valid = false;
      result.errors.push(`Duplicate reminder names: ${[...new Set(dupes)].join(', ')}`);
    }
  }

  return result;
}

export const validateCommand = new Command('validate')
  .description('Validate cron.yaml against the specification')
  .option('-d, --dir <dir>', 'Directory containing cron.yaml', '.')
  .option('-s, --strict', 'Treat warnings as errors', false)
  .action((options: ValidateOptions) => {
    const dir = resolve(options.dir);
    heading('Validating gitcron');
    info(`Directory: ${dir}`);
    divider();

    const result = validateSemantics(dir);

    if (result.valid) {
      success('cron.yaml — valid');
    } else {
      error('cron.yaml — invalid');
      result.errors.forEach(e => error(`  ${e}`));
    }
    result.warnings.forEach(w => warn(`  ${w}`));

    divider();
    const totalErrors = result.errors.length + (options.strict ? result.warnings.length : 0);
    const totalWarnings = options.strict ? 0 : result.warnings.length;

    if (totalErrors === 0) {
      success(`Validation passed (${totalWarnings} warning${totalWarnings !== 1 ? 's' : ''})`);
    } else {
      error(`Validation failed: ${totalErrors} error${totalErrors !== 1 ? 's' : ''}, ${totalWarnings} warning${totalWarnings !== 1 ? 's' : ''}`);
      process.exit(1);
    }
  });
