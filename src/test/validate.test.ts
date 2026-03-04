import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validateStateMachine } from '../task/state-machine.js';

describe('validateStateMachine', () => {
  it('passes valid state machine', () => {
    const errors = validateStateMachine({
      directory: '.gitcron/tasks',
      states: ['pending', 'in_progress', 'done'],
      transitions: {
        pending: ['in_progress'],
        in_progress: ['done'],
        done: [],
      },
    });
    assert.deepStrictEqual(errors, []);
  });

  it('catches invalid transition targets', () => {
    const errors = validateStateMachine({
      directory: '.gitcron/tasks',
      states: ['pending', 'done'],
      transitions: {
        pending: ['nonexistent'],
        done: [],
      },
    });
    assert.ok(errors.some(e => e.includes('nonexistent')));
  });

  it('catches invalid transition keys', () => {
    const errors = validateStateMachine({
      directory: '.gitcron/tasks',
      states: ['pending', 'done'],
      transitions: {
        pending: ['done'],
        done: [],
        ghost: ['pending'],
      },
    });
    assert.ok(errors.some(e => e.includes('ghost')));
  });

  it('catches states without transition entries', () => {
    const errors = validateStateMachine({
      directory: '.gitcron/tasks',
      states: ['pending', 'done', 'review'],
      transitions: {
        pending: ['done'],
        done: [],
      },
    });
    assert.ok(errors.some(e => e.includes('review')));
  });
});
