/**
 * AI agent: feed a doc page to an OpenAI-compatible chat API and get back
 * a normalized ApiSource shape (plus warnings) as strict JSON.
 */
import type { FetchedDoc } from './api-doc-parser';

export interface ParsedApiSource {
  name: string;
  provider: string;
  docUrl: string;
  baseUrl: string;
  endpoint: string;
  method: string;
  authType: string;
  apiKeyEnvName: string;
  model: string;
  requestContentType: string;
  requestBodyTemplate: Record<string, unknown> | unknown[] | string;
  promptFieldPath: string;
  aspectRatioFieldPath: string;
  taskIdPath: string;
  imageUrlPath: string;
  callbackSupported: boolean;
  callbackUrlFieldPath: string;
  pollingSupported: boolean;
  statusEndpoint: string;
  statusMethod: string;
  statusTaskIdParam: string;
  statusPath: string;
  successStatusValue: string;
  failedStatusValue: string;
  errorMessagePath: string;
  supportedAspectRatios: string[];
  notes: string;
}

export interface AiParseResult {
  apiSource: ParsedApiSource;
  warnings: string[];
}

const SYSTEM_PROMPT = `You are an API integration assistant. You will be given the cleaned text of an
image-generation API documentation page. Your job is to extract a normalized
JSON configuration that can be used to call the API programmatically.

Strict rules:
- Output STRICT JSON only. No markdown, no commentary, no code fences.
- Do NOT invent fields. If a value is not stated in the doc, leave that field
  as an empty string (or empty array / false for booleans, depending on the
  field type given in the schema).
- For every field you are unsure about, add a short note to "warnings".
- "requestBodyTemplate" must be a JSON object using template variables:
    {{prompt}} for the user prompt
    {{aspectRatio}} for the aspect ratio
    {{callbackUrl}} for the callback URL (if the API supports callbacks)
    {{model}} optional, for the model id
- "promptFieldPath", "taskIdPath", "imageUrlPath", etc. are dot-paths into
  the request or response JSON (e.g. "data.taskId", "input.prompt").
- "supportedAspectRatios" must be an array of strings exactly as listed in
  the doc (e.g. ["1:1","16:9"]). If unspecified, return an empty array.
- "callbackSupported" / "pollingSupported" are booleans.

Return JSON exactly matching this TypeScript shape:
{
  "apiSource": {
    "name": string,
    "provider": string,
    "docUrl": string,
    "baseUrl": string,
    "endpoint": string,
    "method": "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    "authType": "bearer_token" | "api_key_header" | "api_key_query" | "none",
    "apiKeyEnvName": string,
    "model": string,
    "requestContentType": string,
    "requestBodyTemplate": object,
    "promptFieldPath": string,
    "aspectRatioFieldPath": string,
    "taskIdPath": string,
    "imageUrlPath": string,
    "callbackSupported": boolean,
    "callbackUrlFieldPath": string,
    "pollingSupported": boolean,
    "statusEndpoint": string,
    "statusMethod": string,
    "statusTaskIdParam": string,
    "statusPath": string,
    "successStatusValue": string,
    "failedStatusValue": string,
    "errorMessagePath": string,
    "supportedAspectRatios": string[],
    "notes": string
  },
  "warnings": string[]
}`;

function emptySource(docUrl: string): ParsedApiSource {
  return {
    name: '',
    provider: '',
    docUrl: docUrl,
    baseUrl: '',
    endpoint: '',
    method: 'POST',
    authType: 'bearer_token',
    apiKeyEnvName: '',
    model: '',
    requestContentType: 'application/json',
    requestBodyTemplate: {},
    promptFieldPath: '',
    aspectRatioFieldPath: '',
    taskIdPath: '',
    imageUrlPath: '',
    callbackSupported: false,
    callbackUrlFieldPath: '',
    pollingSupported: false,
    statusEndpoint: '',
    statusMethod: '',
    statusTaskIdParam: '',
    statusPath: '',
    successStatusValue: '',
    failedStatusValue: '',
    errorMessagePath: '',
    supportedAspectRatios: [],
    notes: '',
  };
}

export async function parseDocWithAi(doc: FetchedDoc): Promise<AiParseResult> {
  const provider = (process.env.AI_PROVIDER || 'openai').toLowerCase();
  if (provider !== 'openai') {
    throw new Error(`Unsupported AI_PROVIDER: ${provider}`);
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured on the server');
  }
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');

  const userMsg = [
    `Doc URL: ${doc.url}`,
    `Doc title: ${doc.title}`,
    '',
    '--- DOC TEXT START ---',
    doc.text,
    '--- DOC TEXT END ---',
  ].join('\n');

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMsg },
      ],
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`AI provider HTTP ${res.status}: ${errText.slice(0, 500)}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content || '';
  if (!content) throw new Error('AI returned an empty response');

  // Be lenient: strip any accidental code fences
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    throw new Error(`AI did not return valid JSON: ${(e as Error).message}`);
  }

  const obj = parsed as { apiSource?: Partial<ParsedApiSource>; warnings?: unknown };
  if (!obj || typeof obj !== 'object') throw new Error('AI returned non-object JSON');

  const base = emptySource(doc.url);
  const apiSource: ParsedApiSource = { ...base, ...(obj.apiSource || {}) } as ParsedApiSource;

  // Coerce types softly
  if (typeof apiSource.callbackSupported !== 'boolean') {
    apiSource.callbackSupported = !!apiSource.callbackSupported;
  }
  if (typeof apiSource.pollingSupported !== 'boolean') {
    apiSource.pollingSupported = !!apiSource.pollingSupported;
  }
  if (!Array.isArray(apiSource.supportedAspectRatios)) {
    apiSource.supportedAspectRatios = [];
  } else {
    apiSource.supportedAspectRatios = apiSource.supportedAspectRatios
      .filter((v): v is string => typeof v === 'string')
      .map((v) => v.trim())
      .filter((v) => v.length > 0);
  }
  if (!apiSource.docUrl) apiSource.docUrl = doc.url;

  const warnings = Array.isArray(obj.warnings)
    ? obj.warnings.filter((w): w is string => typeof w === 'string').slice(0, 32)
    : [];

  return { apiSource, warnings };
}
