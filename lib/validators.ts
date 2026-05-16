import { z } from 'zod';

/**
 * Strong-ish guard against SSRF and bad inputs. Used both for outgoing
 * 3rd-party API calls and for the AI doc-parser fetch.
 */
export function isUrlSafe(raw: string): { ok: true } | { ok: false; reason: string } {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return { ok: false, reason: 'invalid URL' };
  }

  if (u.protocol !== 'https:' && u.protocol !== 'http:') {
    return { ok: false, reason: `unsupported protocol: ${u.protocol}` };
  }

  // Block obvious local / private hostnames
  const host = u.hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host === '0.0.0.0' ||
    host.endsWith('.localhost') ||
    host === '::1' ||
    host === '[::1]'
  ) {
    return { ok: false, reason: 'localhost is not allowed' };
  }

  // IPv4 private/loopback ranges
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    // 127.0.0.0/8 loopback
    if (a === 127) return { ok: false, reason: 'loopback IP not allowed' };
    // 10.0.0.0/8
    if (a === 10) return { ok: false, reason: 'private IP not allowed' };
    // 192.168.0.0/16
    if (a === 192 && b === 168) return { ok: false, reason: 'private IP not allowed' };
    // 172.16.0.0/12
    if (a === 172 && b >= 16 && b <= 31) return { ok: false, reason: 'private IP not allowed' };
    // 169.254.0.0/16 link-local (incl. AWS metadata)
    if (a === 169 && b === 254) return { ok: false, reason: 'link-local IP not allowed' };
    // 0.0.0.0/8
    if (a === 0) return { ok: false, reason: 'reserved IP not allowed' };
  }

  // IPv6 unique-local / loopback (rough)
  if (host.startsWith('[') && host.endsWith(']')) {
    const v6 = host.slice(1, -1).toLowerCase();
    if (v6 === '::1' || v6.startsWith('fc') || v6.startsWith('fd') || v6.startsWith('fe80')) {
      return { ok: false, reason: 'private IPv6 not allowed' };
    }
  }

  return { ok: true };
}

// ===== Zod schemas =====

export const generateImageSchema = z.object({
  prompt: z.string().trim().min(1, 'prompt is required').max(4000, 'prompt too long'),
  aspectRatio: z.string().trim().max(16).optional(),
  apiSourceId: z.string().trim().max(64).optional(),
});

export const taskStatusQuerySchema = z.object({
  taskId: z.string().trim().min(1).max(128),
});

export const adminLoginSchema = z.object({
  password: z.string().min(1).max(256),
});

export const parseApiDocSchema = z.object({
  docUrl: z.string().trim().url(),
});

const aspectRatioListSchema = z.array(z.string().trim().min(1).max(16)).max(32);

export const apiSourceUpsertSchema = z.object({
  name: z.string().trim().min(1).max(120),
  provider: z.string().trim().min(1).max(120),
  docUrl: z.string().trim().url().optional().or(z.literal('').transform(() => undefined)),
  baseUrl: z.string().trim().url(),
  endpoint: z.string().trim().min(1).max(512),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).default('POST'),
  authType: z.enum(['bearer_token', 'api_key_header', 'api_key_query', 'none']).default('bearer_token'),
  apiKeyEnvName: z.string().trim().max(120).optional().or(z.literal('').transform(() => undefined)),
  model: z.string().trim().max(200).optional().or(z.literal('').transform(() => undefined)),
  requestContentType: z.string().trim().max(120).default('application/json'),
  // Either a JSON string or a parseable object
  requestBodyTemplate: z.union([z.string(), z.record(z.any()), z.array(z.any())]),
  promptFieldPath: z.string().trim().max(200).optional().or(z.literal('').transform(() => undefined)),
  aspectRatioFieldPath: z.string().trim().max(200).optional().or(z.literal('').transform(() => undefined)),
  taskIdPath: z.string().trim().max(200).optional().or(z.literal('').transform(() => undefined)),
  imageUrlPath: z.string().trim().max(200).optional().or(z.literal('').transform(() => undefined)),
  callbackSupported: z.boolean().default(false),
  callbackUrlFieldPath: z.string().trim().max(200).optional().or(z.literal('').transform(() => undefined)),
  pollingSupported: z.boolean().default(false),
  statusEndpoint: z.string().trim().max(512).optional().or(z.literal('').transform(() => undefined)),
  statusMethod: z.enum(['GET', 'POST']).optional().or(z.literal('').transform(() => undefined)),
  statusTaskIdParam: z.string().trim().max(120).optional().or(z.literal('').transform(() => undefined)),
  statusPath: z.string().trim().max(200).optional().or(z.literal('').transform(() => undefined)),
  successStatusValue: z.string().trim().max(120).optional().or(z.literal('').transform(() => undefined)),
  failedStatusValue: z.string().trim().max(120).optional().or(z.literal('').transform(() => undefined)),
  errorMessagePath: z.string().trim().max(200).optional().or(z.literal('').transform(() => undefined)),
  supportedAspectRatios: aspectRatioListSchema.default(['auto', '1:1', '16:9', '9:16', '4:3', '3:4']),
  notes: z.string().max(2000).optional().or(z.literal('').transform(() => undefined)),
  enabled: z.boolean().default(true),
  isDefault: z.boolean().default(false),
});

export type ApiSourceUpsertInput = z.infer<typeof apiSourceUpsertSchema>;

/**
 * Normalize requestBodyTemplate into a JSON string.
 */
export function normalizeBodyTemplate(input: unknown): string {
  if (typeof input === 'string') {
    // Validate that it's JSON-parseable; we only support JSON templates today.
    JSON.parse(input);
    return input;
  }
  return JSON.stringify(input);
}
