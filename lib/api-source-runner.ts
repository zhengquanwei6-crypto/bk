/**
 * Generic runner that executes a third-party image generation API
 * based on an ApiSource configuration.
 */
import type { ApiSource } from '@prisma/client';
import { renderJsonTemplate, renderTemplate } from './template-render';
import { getStringByPath } from './path-reader';
import { isUrlSafe } from './validators';

export interface RunCreateTaskInput {
  prompt: string;
  aspectRatio?: string;
  callbackUrl?: string;
}

export interface RunCreateTaskResult {
  ok: boolean;
  status: number;
  taskId?: string;
  imageUrl?: string;
  error?: string;
  rawResponse: unknown;
}

/**
 * Build the final URL with auth applied (api_key_query also goes here).
 */
function buildUrl(source: ApiSource, apiKey: string | undefined): string {
  const base = source.baseUrl.replace(/\/+$/, '');
  const ep = source.endpoint.startsWith('/') ? source.endpoint : `/${source.endpoint}`;
  let url = `${base}${ep}`;

  if (source.authType === 'api_key_query' && apiKey) {
    const sep = url.includes('?') ? '&' : '?';
    const param = source.apiKeyEnvName ? 'api_key' : 'api_key';
    url = `${url}${sep}${encodeURIComponent(param)}=${encodeURIComponent(apiKey)}`;
  }

  return url;
}

function buildHeaders(source: ApiSource, apiKey: string | undefined): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': source.requestContentType || 'application/json',
    Accept: 'application/json',
  };

  switch (source.authType) {
    case 'bearer_token':
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
      break;
    case 'api_key_header':
      if (apiKey) headers['x-api-key'] = apiKey;
      break;
    case 'api_key_query':
    case 'none':
    default:
      break;
  }

  return headers;
}

function readApiKey(source: ApiSource): string | undefined {
  if (!source.apiKeyEnvName) return undefined;
  const v = process.env[source.apiKeyEnvName];
  return v && v.length > 0 ? v : undefined;
}

/**
 * Render the request body template with vars.
 * If the configured content type is JSON we parse + render + stringify.
 * Otherwise, we treat it as a raw string with placeholder substitution.
 */
function buildBody(source: ApiSource, vars: Record<string, string>): { body: string; ok: true } | { ok: false; error: string } {
  try {
    if ((source.requestContentType || 'application/json').includes('json')) {
      const rendered = renderJsonTemplate(source.requestBodyTemplate, vars);
      return { ok: true, body: JSON.stringify(rendered) };
    }
    const rendered = renderTemplate(source.requestBodyTemplate, vars);
    return { ok: true, body: String(rendered) };
  } catch (e) {
    return { ok: false, error: `Invalid requestBodyTemplate: ${(e as Error).message}` };
  }
}

export async function runCreateTask(source: ApiSource, input: RunCreateTaskInput): Promise<RunCreateTaskResult> {
  if (source.authType !== 'none' && !source.apiKeyEnvName) {
    return { ok: false, status: 0, error: 'API source has no apiKeyEnvName configured', rawResponse: null };
  }

  const apiKey = readApiKey(source);
  if (source.authType !== 'none' && !apiKey) {
    return {
      ok: false,
      status: 0,
      error: `Server is missing env var: ${source.apiKeyEnvName}`,
      rawResponse: null,
    };
  }

  const url = buildUrl(source, apiKey);
  const safety = isUrlSafe(url);
  if (!safety.ok) {
    return { ok: false, status: 0, error: `Unsafe target URL: ${safety.reason}`, rawResponse: null };
  }

  const headers = buildHeaders(source, apiKey);

  const vars: Record<string, string> = {
    prompt: input.prompt,
    aspectRatio: input.aspectRatio ?? '',
    callbackUrl: input.callbackUrl ?? '',
    model: source.model ?? '',
  };

  const builtBody = buildBody(source, vars);
  if (!builtBody.ok) {
    return { ok: false, status: 0, error: builtBody.error, rawResponse: null };
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: source.method || 'POST',
      headers,
      body: source.method === 'GET' ? undefined : builtBody.body,
      // 30s timeout via AbortSignal
      signal: AbortSignal.timeout(30_000),
    });
  } catch (e) {
    return {
      ok: false,
      status: 0,
      error: `Request failed: ${(e as Error).message}`,
      rawResponse: null,
    };
  }

  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { raw: text };
  }

  if (!res.ok) {
    const errMsg =
      getStringByPath(parsed, source.errorMessagePath) ||
      `Provider returned HTTP ${res.status}`;
    return {
      ok: false,
      status: res.status,
      error: errMsg,
      rawResponse: parsed,
    };
  }

  const taskId = getStringByPath(parsed, source.taskIdPath);
  const imageUrl = getStringByPath(parsed, source.imageUrlPath);

  // Some providers respond synchronously with image URL, some with task id.
  if (!taskId && !imageUrl) {
    const errMsg = getStringByPath(parsed, source.errorMessagePath);
    return {
      ok: false,
      status: res.status,
      error: errMsg || 'Provider response did not contain taskId or imageUrl',
      rawResponse: parsed,
    };
  }

  return {
    ok: true,
    status: res.status,
    taskId,
    imageUrl,
    rawResponse: parsed,
  };
}

/**
 * Optional polling: query a status endpoint to check for completion.
 * Returns either { status: 'success' | 'failed' | 'pending', imageUrl?, error? }.
 */
export interface PollStatusResult {
  ok: boolean;
  status: 'success' | 'failed' | 'pending';
  imageUrl?: string;
  error?: string;
  rawResponse: unknown;
}

export async function runPollStatus(source: ApiSource, taskId: string): Promise<PollStatusResult> {
  if (!source.pollingSupported || !source.statusEndpoint) {
    return { ok: false, status: 'pending', error: 'Polling not supported by this source', rawResponse: null };
  }

  const apiKey = readApiKey(source);
  const method = (source.statusMethod || 'GET').toUpperCase();
  const base = source.baseUrl.replace(/\/+$/, '');
  let endpoint = source.statusEndpoint.startsWith('/') ? source.statusEndpoint : `/${source.statusEndpoint}`;

  // Substitute {{taskId}} into endpoint if present
  endpoint = endpoint.replace(/\{\{\s*taskId\s*\}\}/g, encodeURIComponent(taskId));

  let url = `${base}${endpoint}`;
  let body: string | undefined;

  if (method === 'GET') {
    if (source.statusTaskIdParam) {
      const sep = url.includes('?') ? '&' : '?';
      url = `${url}${sep}${encodeURIComponent(source.statusTaskIdParam)}=${encodeURIComponent(taskId)}`;
    }
  } else {
    const obj: Record<string, unknown> = {};
    if (source.statusTaskIdParam) obj[source.statusTaskIdParam] = taskId;
    body = JSON.stringify(obj);
  }

  if (source.authType === 'api_key_query' && apiKey) {
    const sep = url.includes('?') ? '&' : '?';
    url = `${url}${sep}api_key=${encodeURIComponent(apiKey)}`;
  }

  const safety = isUrlSafe(url);
  if (!safety.ok) {
    return { ok: false, status: 'pending', error: `Unsafe URL: ${safety.reason}`, rawResponse: null };
  }

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (method !== 'GET') headers['Content-Type'] = 'application/json';
  if (source.authType === 'bearer_token' && apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
  if (source.authType === 'api_key_header' && apiKey) headers['x-api-key'] = apiKey;

  try {
    const res = await fetch(url, {
      method,
      headers,
      body,
      signal: AbortSignal.timeout(20_000),
    });
    const text = await res.text();
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = { raw: text };
    }

    if (!res.ok) {
      return {
        ok: false,
        status: 'pending',
        error: getStringByPath(parsed, source.errorMessagePath) || `HTTP ${res.status}`,
        rawResponse: parsed,
      };
    }

    const statusValue = getStringByPath(parsed, source.statusPath);
    const imageUrl = getStringByPath(parsed, source.imageUrlPath);
    const errorMsg = getStringByPath(parsed, source.errorMessagePath);

    if (source.successStatusValue && statusValue === source.successStatusValue) {
      return { ok: true, status: 'success', imageUrl, rawResponse: parsed };
    }
    if (source.failedStatusValue && statusValue === source.failedStatusValue) {
      return { ok: true, status: 'failed', error: errorMsg, rawResponse: parsed };
    }
    if (imageUrl) {
      return { ok: true, status: 'success', imageUrl, rawResponse: parsed };
    }
    return { ok: true, status: 'pending', rawResponse: parsed };
  } catch (e) {
    return { ok: false, status: 'pending', error: (e as Error).message, rawResponse: null };
  }
}
