const FIELD_RANGES: [number, number][] = [
  [0, 59],   // minute
  [0, 23],   // hour
  [1, 31],   // day of month
  [1, 12],   // month
  [0, 7],    // day of week (0 and 7 = Sunday)
];

const FIELD_NAMES = ['minute', 'hour', 'day-of-month', 'month', 'day-of-week'];

function validateField(field: string, min: number, max: number, name: string): string | null {
  // Handle wildcard
  if (field === '*') return null;

  // Handle step values: */2, 1-5/2
  const stepMatch = field.match(/^(.+)\/(\d+)$/);
  if (stepMatch) {
    const step = parseInt(stepMatch[2], 10);
    if (step === 0) return `${name}: step value cannot be 0`;
    const baseErr = validateField(stepMatch[1], min, max, name);
    if (baseErr && stepMatch[1] !== '*') return baseErr;
    return null;
  }

  // Handle lists: 1,3,5
  if (field.includes(',')) {
    for (const part of field.split(',')) {
      const err = validateField(part.trim(), min, max, name);
      if (err) return err;
    }
    return null;
  }

  // Handle ranges: 1-5
  const rangeMatch = field.match(/^(\d+)-(\d+)$/);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1], 10);
    const end = parseInt(rangeMatch[2], 10);
    if (start < min || start > max) return `${name}: ${start} out of range ${min}-${max}`;
    if (end < min || end > max) return `${name}: ${end} out of range ${min}-${max}`;
    if (start > end) return `${name}: range start ${start} > end ${end}`;
    return null;
  }

  // Handle single value
  const val = parseInt(field, 10);
  if (isNaN(val)) return `${name}: invalid value "${field}"`;
  if (val < min || val > max) return `${name}: ${val} out of range ${min}-${max}`;
  return null;
}

export function validateCronExpression(expr: string): { valid: boolean; errors: string[] } {
  const fields = expr.trim().split(/\s+/);
  if (fields.length !== 5) {
    return { valid: false, errors: [`Expected 5 fields, got ${fields.length}`] };
  }

  const errors: string[] = [];
  for (let i = 0; i < 5; i++) {
    const err = validateField(fields[i], FIELD_RANGES[i][0], FIELD_RANGES[i][1], FIELD_NAMES[i]);
    if (err) errors.push(err);
  }

  return { valid: errors.length === 0, errors };
}

export function describeCron(expr: string): string {
  const fields = expr.trim().split(/\s+/);
  if (fields.length !== 5) return expr;

  const [min, hour, dom, mon, dow] = fields;

  // Common patterns
  if (min !== '*' && hour !== '*' && dom === '*' && mon === '*' && dow === '*') {
    return `Daily at ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;
  }
  if (dom === '*' && mon === '*' && dow !== '*') {
    return `Every ${dowName(dow)} at ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;
  }

  return expr;
}

function dowName(field: string): string {
  const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const val = parseInt(field, 10);
  return isNaN(val) ? field : (names[val] || field);
}
