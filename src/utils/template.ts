export function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    return vars[key] ?? `{{${key}}}`;
  });
}

export function defaultVars(scheduleName: string): Record<string, string> {
  const now = new Date();
  return {
    name: scheduleName,
    date: now.toISOString().split('T')[0],
    datetime: now.toISOString(),
    timestamp: String(Math.floor(now.getTime() / 1000)),
  };
}
