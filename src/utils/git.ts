import { execSync } from 'node:child_process';

export function gitAdd(files: string[], cwd: string): void {
  execSync(`git add ${files.map(f => `"${f}"`).join(' ')}`, { cwd, stdio: 'pipe' });
}

export function gitCommit(message: string, cwd: string, author?: { name: string; email: string }): void {
  const env: Record<string, string> = { ...process.env } as Record<string, string>;
  if (author) {
    env.GIT_AUTHOR_NAME = author.name;
    env.GIT_AUTHOR_EMAIL = author.email;
    env.GIT_COMMITTER_NAME = author.name;
    env.GIT_COMMITTER_EMAIL = author.email;
  }
  execSync(`git commit -m "${message.replace(/"/g, '\\"')}"`, { cwd, env, stdio: 'pipe' });
}

export function isGitRepo(cwd: string): boolean {
  try {
    execSync('git rev-parse --is-inside-work-tree', { cwd, stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}
