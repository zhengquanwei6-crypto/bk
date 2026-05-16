/**
 * Recursively render `{{var}}` placeholders inside arbitrary JSON-like values.
 *
 * Supported variables (caller decides which to pass):
 *   {{prompt}}        - user prompt
 *   {{aspectRatio}}   - selected aspect ratio
 *   {{callbackUrl}}   - callback URL the provider should call
 *   {{model}}         - model id from ApiSource.model
 *
 * If a string is *exactly* one placeholder (e.g. "{{prompt}}"), the typed
 * value is preserved (string, number, boolean, etc).
 *
 * If a placeholder cannot be resolved, the placeholder text is left as-is.
 */
export type TemplateVars = Record<string, string | number | boolean | undefined | null>;

const PLACEHOLDER = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
const EXACT_PLACEHOLDER = /^\s*\{\{\s*([a-zA-Z0-9_]+)\s*\}\}\s*$/;

export function renderTemplate<T = unknown>(input: T, vars: TemplateVars): T {
  return walk(input, vars) as T;
}

function walk(value: unknown, vars: TemplateVars): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return renderString(value, vars);
  if (Array.isArray(value)) return value.map((v) => walk(v, vars));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = walk(v, vars);
    }
    return out;
  }
  return value;
}

function renderString(s: string, vars: TemplateVars): unknown {
  // Exact match: keep typed value (e.g. number or boolean) if possible
  const exact = s.match(EXACT_PLACEHOLDER);
  if (exact) {
    const key = exact[1];
    if (key in vars) {
      const v = vars[key];
      return v === undefined ? '' : v;
    }
    return s; // leave unresolved
  }

  // Inline: stringify
  return s.replace(PLACEHOLDER, (full, key: string) => {
    if (key in vars) {
      const v = vars[key];
      return v === undefined || v === null ? '' : String(v);
    }
    return full;
  });
}

/**
 * Parse a JSON template string and render its variables.
 * Throws if the template is not valid JSON.
 */
export function renderJsonTemplate(jsonString: string, vars: TemplateVars): unknown {
  const parsed = JSON.parse(jsonString);
  return renderTemplate(parsed, vars);
}
