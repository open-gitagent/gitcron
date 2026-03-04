import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validateCronExpression, describeCron } from '../utils/cron.js';

describe('validateCronExpression', () => {
  it('validates standard cron expressions', () => {
    assert.deepStrictEqual(validateCronExpression('0 2 * * *').valid, true);
    assert.deepStrictEqual(validateCronExpression('*/15 * * * *').valid, true);
    assert.deepStrictEqual(validateCronExpression('0 9 1 */3 *').valid, true);
    assert.deepStrictEqual(validateCronExpression('0 0 * * 0').valid, true);
    assert.deepStrictEqual(validateCronExpression('30 6 * * 1-5').valid, true);
  });

  it('rejects invalid expressions', () => {
    assert.deepStrictEqual(validateCronExpression('').valid, false);
    assert.deepStrictEqual(validateCronExpression('* *').valid, false);
    assert.deepStrictEqual(validateCronExpression('60 * * * *').valid, false);
    assert.deepStrictEqual(validateCronExpression('* 25 * * *').valid, false);
    assert.deepStrictEqual(validateCronExpression('* * 32 * *').valid, false);
    assert.deepStrictEqual(validateCronExpression('* * * 13 *').valid, false);
    assert.deepStrictEqual(validateCronExpression('* * * * 8').valid, false);
  });

  it('validates step values', () => {
    assert.deepStrictEqual(validateCronExpression('*/5 * * * *').valid, true);
    assert.deepStrictEqual(validateCronExpression('1-30/2 * * * *').valid, true);
  });

  it('validates comma-separated values', () => {
    assert.deepStrictEqual(validateCronExpression('0,15,30,45 * * * *').valid, true);
    assert.deepStrictEqual(validateCronExpression('0 9,17 * * 1,3,5').valid, true);
  });

  it('rejects step of zero', () => {
    assert.deepStrictEqual(validateCronExpression('*/0 * * * *').valid, false);
  });
});

describe('describeCron', () => {
  it('describes daily schedules', () => {
    assert.strictEqual(describeCron('0 2 * * *'), 'Daily at 02:00');
  });

  it('returns raw expression for complex patterns', () => {
    assert.strictEqual(describeCron('*/15 * * * *'), '*/15 * * * *');
  });
});
