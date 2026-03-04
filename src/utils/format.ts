import chalk from 'chalk';

export function success(msg: string): void {
  console.log(chalk.green('✓') + ' ' + msg);
}

export function error(msg: string): void {
  console.log(chalk.red('✗') + ' ' + msg);
}

export function warn(msg: string): void {
  console.log(chalk.yellow('!') + ' ' + msg);
}

export function info(msg: string): void {
  console.log(chalk.blue('i') + ' ' + msg);
}

export function heading(msg: string): void {
  console.log('\n' + chalk.bold(msg));
}

export function label(key: string, value: string): void {
  console.log(`  ${chalk.gray(key + ':')} ${value}`);
}

export function divider(): void {
  console.log(chalk.gray('─'.repeat(60)));
}

export function table(headers: string[], rows: string[][]): void {
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map(r => (r[i] || '').length))
  );
  const sep = widths.map(w => '─'.repeat(w + 2)).join('┼');
  const fmt = (cells: string[]) =>
    cells.map((c, i) => ` ${(c || '').padEnd(widths[i])} `).join('│');

  console.log(chalk.gray(fmt(headers)));
  console.log(chalk.gray(sep));
  rows.forEach(r => console.log(fmt(r)));
}
