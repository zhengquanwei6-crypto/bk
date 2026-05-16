/**
 * Fetch a public API documentation URL and return cleaned text suitable for
 * feeding to an LLM.
 */
import * as cheerio from 'cheerio';
import { isUrlSafe } from './validators';

export interface FetchedDoc {
  url: string;
  title: string;
  text: string;
}

const MAX_BYTES = 1_500_000; // ~1.5 MB
const MAX_TEXT_CHARS = 60_000; // Hard cap fed to the LLM

export async function fetchAndCleanDoc(url: string): Promise<FetchedDoc> {
  const safety = isUrlSafe(url);
  if (!safety.ok) {
    throw new Error(`Refusing to fetch unsafe URL: ${safety.reason}`);
  }

  const res = await fetch(url, {
    method: 'GET',
    redirect: 'follow',
    signal: AbortSignal.timeout(20_000),
    headers: {
      'User-Agent': 'AIImageGeneratorPlatform/1.0 (+docs-parser)',
      Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.5',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch doc: HTTP ${res.status}`);
  }

  const contentType = (res.headers.get('content-type') || '').toLowerCase();

  // Read with a hard byte cap
  const reader = res.body?.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        bytes += value.byteLength;
        if (bytes > MAX_BYTES) {
          try { await reader.cancel(); } catch { /* noop */ }
          break;
        }
        chunks.push(value);
      }
    }
  }
  const buf = Buffer.concat(chunks.map((c) => Buffer.from(c)));
  const raw = buf.toString('utf8');

  if (contentType.includes('application/json')) {
    const truncated = raw.slice(0, MAX_TEXT_CHARS);
    return { url, title: url, text: truncated };
  }

  // HTML / unknown: parse with cheerio and extract text
  const $ = cheerio.load(raw);
  // Drop noise
  $('script, style, noscript, svg, iframe, footer, nav, header').remove();

  const title = ($('title').first().text() || $('h1').first().text() || url).trim();

  // Prefer common doc containers; fall back to body
  const candidates = [
    'main',
    'article',
    '.markdown-body',
    '.docs-content',
    '.theme-doc-markdown',
    '#__next',
    'body',
  ];
  let containerText = '';
  for (const sel of candidates) {
    const el = $(sel).first();
    if (el && el.text().trim().length > 200) {
      containerText = el.text();
      break;
    }
  }
  if (!containerText) containerText = $('body').text();

  // Collapse whitespace
  const cleaned = containerText
    .replace(/\u00A0/g, ' ')
    .split('\n')
    .map((line) => line.replace(/[\t ]+/g, ' ').trim())
    .filter((line) => line.length > 0)
    .join('\n');

  const truncated = cleaned.slice(0, MAX_TEXT_CHARS);
  return { url, title, text: truncated };
}
