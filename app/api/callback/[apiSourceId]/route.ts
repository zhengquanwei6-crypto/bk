import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStringByPath } from '@/lib/path-reader';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Generic callback receiver. Looks up the API source, then uses its
 * configured paths (taskIdPath, imageUrlPath, errorMessagePath) to
 * locate fields in the incoming payload.
 *
 * Supports POST (JSON body), GET (query params), and POST with
 * application/x-www-form-urlencoded body.
 */
async function handleCallback(req: NextRequest, apiSourceId: string) {
  if (!apiSourceId) {
    return NextResponse.json({ success: false, error: 'Missing apiSourceId' }, { status: 400 });
  }

  const source = await prisma.apiSource.findUnique({ where: { id: apiSourceId } });
  if (!source) {
    return NextResponse.json({ success: false, error: 'API source not found' }, { status: 404 });
  }

  const payload = await readCallbackPayload(req);
  if (payload === null) {
    return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
  }

  const taskId = getStringByPath(payload, source.taskIdPath);
  const imageUrl = getStringByPath(payload, source.imageUrlPath);
  const errorMessage = getStringByPath(payload, source.errorMessagePath);

  if (!taskId) {
    return NextResponse.json(
      { success: false, error: 'Could not extract taskId from callback' },
      { status: 400 },
    );
  }

  const task = await prisma.imageTask.findUnique({ where: { taskId } });
  if (!task || task.apiSourceId !== apiSourceId) {
    return NextResponse.json(
      { success: false, error: 'Task not found for this API source' },
      { status: 404 },
    );
  }

  const rawCallback = JSON.stringify(payload).slice(0, 50_000);

  // If the source declares status values, honor them; otherwise infer from imageUrl/error.
  let status: string = task.status;
  if (source.statusPath) {
    const v = getStringByPath(payload, source.statusPath);
    if (v && source.successStatusValue && v === source.successStatusValue) status = 'success';
    else if (v && source.failedStatusValue && v === source.failedStatusValue) status = 'failed';
  }
  if (status !== 'success' && status !== 'failed') {
    if (imageUrl) status = 'success';
    else if (errorMessage) status = 'failed';
  }

  await prisma.imageTask.update({
    where: { id: task.id },
    data: {
      status,
      imageUrl: imageUrl || task.imageUrl,
      error: status === 'failed' ? (errorMessage || 'Generation failed') : null,
      rawCallback,
    },
  });

  // Most providers expect a 200 OK with a small body
  return NextResponse.json({ success: true });
}

/**
 * Read the callback payload as a plain object, regardless of method/content-type.
 * Returns null if the body could not be parsed at all.
 */
async function readCallbackPayload(req: NextRequest): Promise<Record<string, unknown> | null> {
  // GET: collect query params into an object
  if (req.method === 'GET') {
    const obj: Record<string, unknown> = {};
    req.nextUrl.searchParams.forEach((v, k) => { obj[k] = v; });
    return obj;
  }

  const contentType = (req.headers.get('content-type') || '').toLowerCase();
  const text = await req.text();

  if (!text) return {};

  if (contentType.includes('application/json')) {
    try {
      const parsed = JSON.parse(text);
      return isPlainObject(parsed) ? parsed : { raw: parsed };
    } catch { return null; }
  }
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const obj: Record<string, unknown> = {};
    new URLSearchParams(text).forEach((v, k) => { obj[k] = v; });
    return obj;
  }
  // Fallback: try JSON, else expose as { raw }
  try {
    const parsed = JSON.parse(text);
    return isPlainObject(parsed) ? parsed : { raw: parsed };
  } catch { return { raw: text }; }
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export async function POST(req: NextRequest, { params }: { params: { apiSourceId: string } }) {
  return handleCallback(req, params.apiSourceId);
}

// Some providers use GET callbacks with query params - support them as a courtesy
export async function GET(req: NextRequest, { params }: { params: { apiSourceId: string } }) {
  return handleCallback(req, params.apiSourceId);
}
