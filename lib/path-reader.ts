/**
 * Read a value from an arbitrary object/array using a dot-path.
 *
 * Examples:
 *   getValueByPath(resp, "data.taskId")
 *   getValueByPath(resp, "data.images.0.url")
 *
 * Returns undefined when the path can't be resolved.
 */
export function getValueByPath(input: unknown, path: string | null | undefined): unknown {
  if (!path) return undefined;
  if (input === null || input === undefined) return undefined;

  const segments = path
    .split('.')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  let current: unknown = input;
  for (const seg of segments) {
    if (current === null || current === undefined) return undefined;
    if (Array.isArray(current)) {
      const idx = Number(seg);
      if (!Number.isInteger(idx) || idx < 0 || idx >= current.length) return undefined;
      current = current[idx];
    } else if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[seg];
    } else {
      return undefined;
    }
  }
  return current;
}

export function getStringByPath(input: unknown, path: string | null | undefined): string | undefined {
  const v = getValueByPath(input, path);
  if (v === undefined || v === null) return undefined;
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return undefined;
}
