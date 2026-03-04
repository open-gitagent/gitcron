import type { TasksConfig } from '../utils/loader.js';

const DEFAULT_STATES = ['pending', 'in_progress', 'review', 'done', 'cancelled'];
const DEFAULT_TRANSITIONS: Record<string, string[]> = {
  pending: ['in_progress', 'cancelled'],
  in_progress: ['review', 'done', 'cancelled'],
  review: ['in_progress', 'done'],
  done: [],
  cancelled: [],
};

export function getStates(config?: TasksConfig): string[] {
  return config?.states ?? DEFAULT_STATES;
}

export function getTransitions(config?: TasksConfig): Record<string, string[]> {
  return config?.transitions ?? DEFAULT_TRANSITIONS;
}

export function validateTransition(
  from: string,
  to: string,
  config?: TasksConfig
): { valid: boolean; error?: string } {
  const states = getStates(config);
  const transitions = getTransitions(config);

  if (!states.includes(from)) {
    return { valid: false, error: `Unknown state: "${from}"` };
  }
  if (!states.includes(to)) {
    return { valid: false, error: `Unknown state: "${to}"` };
  }

  const allowed = transitions[from];
  if (!allowed || !allowed.includes(to)) {
    return {
      valid: false,
      error: `Invalid transition: "${from}" → "${to}". Allowed: ${(allowed || []).join(', ') || 'none'}`,
    };
  }

  return { valid: true };
}

export function validateStateMachine(config: TasksConfig): string[] {
  const errors: string[] = [];
  const { states, transitions } = config;

  // All transition keys must be valid states
  for (const key of Object.keys(transitions)) {
    if (!states.includes(key)) {
      errors.push(`Transition key "${key}" is not a defined state`);
    }
  }

  // All transition targets must be valid states
  for (const [from, targets] of Object.entries(transitions)) {
    for (const to of targets) {
      if (!states.includes(to)) {
        errors.push(`Transition target "${to}" (from "${from}") is not a defined state`);
      }
    }
  }

  // Every state should have a transition entry (even if empty)
  for (const state of states) {
    if (!(state in transitions)) {
      errors.push(`State "${state}" has no transitions entry`);
    }
  }

  return errors;
}
