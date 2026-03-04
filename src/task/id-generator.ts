import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function generateTaskId(tasksDir: string): string {
  if (!existsSync(tasksDir)) {
    return 'TASK-001';
  }

  const files = readdirSync(tasksDir).filter(f => /^TASK-\d+\.yaml$/.test(f));
  if (files.length === 0) {
    return 'TASK-001';
  }

  const maxNum = Math.max(
    ...files.map(f => {
      const match = f.match(/^TASK-(\d+)\.yaml$/);
      return match ? parseInt(match[1], 10) : 0;
    })
  );

  return `TASK-${String(maxNum + 1).padStart(3, '0')}`;
}
