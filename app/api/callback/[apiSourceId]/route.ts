import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStringByPath } from '@/lib/path-reader';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/callback/[apiSourceId]
 * Generic callback receiver. Looks up the API source, then uses its
 * configured paths (taskIdPath, imageUrlPath, errorMessagePath) to
 * locate fields in the incoming payload.
 */
export async function POST(req: NextRequest, { params }: { params: { apiSourceId: string } }) {
  const apiSourceId = params.apiSourceId;
  if (!apiSourceId) {
    return NextResponse.json({ success: false, error: 'Missing apiSourceId' }, { status: 400 });
  }

  const source = await prisma.apiSource.findUnique({ where: { id: apiSourceId } });
  if (!source) {
    return NextResponse.json({ success: false, error: 'API source not found' }, { status: 404 });
  }

  let payload: unknown = null;
  try {
    const txt = await req.text();
    payload = txt ? JSON.parse(txt) : {};
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const taskId = getStringByPath(payload, source.taskIdPath);
  const imageUrl = getStringByPath(payload, source.imageUrlPath);
  const errorMessage = getStringByPath(payload, source.errorMessagePath);

  if (!taskId) {
    // Still record this somewhere? We have no key to update, so just 200 it.
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

// Some providers use GET callbacks - support them as a courtesy
export async function GET(req: NextRequest, ctx: { params: { apiSourceId: string } }) {
  return POST(req, ctx);
}
