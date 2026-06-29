export function parseBoolean(val: unknown): boolean {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') return val === 'true' || val === '1';
  return Boolean(val);
}

export function parseIntOrNull(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  const n = Number(val);
  return Number.isNaN(n) ? null : n;
}

export function parseDate(val: unknown): string | null {
  if (typeof val !== 'string') return null;
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function parseRow<T>(row: Record<string, unknown>, schema: Record<string, 'string' | 'number' | 'boolean' | 'date'>): T {
  const result: Record<string, unknown> = {};
  for (const [key, type] of Object.entries(schema)) {
    const val = row[key];
    switch (type) {
      case 'boolean':
        result[key] = parseBoolean(val);
        break;
      case 'number':
        result[key] = parseIntOrNull(val);
        break;
      case 'date':
        result[key] = parseDate(val);
        break;
      default:
        result[key] = val ?? null;
    }
  }
  return result as T;
}
