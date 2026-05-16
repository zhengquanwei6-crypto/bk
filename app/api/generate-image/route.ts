import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateImageSchema } from '@/lib/validators';
import { runCreateTask } from '@/lib/api-source-runner';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/generate-image
 * Body: { prompt, aspectRatio?, apiSourceId? }
 * Returns: { success: true, taskId } | { success: false, error }
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = generateImageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message || 'Invalid request' },
      { status: 400 },
    );
  }
  const { prompt, aspectRatio, apiSourceId } = parsed.data;

  // Pick API source
  const source = apiSourceId
    ? await prisma.apiSource.findUnique({ where: { id: apiSourceId } })
    : await prisma.apiSource.findFirst({ where: { isDefault: true, enabled: true } });

  if (!source) {
    return NextResponse.json(
      { success: false, error: apiSourceId ? 'API source not found' : 'No default API source configured' },
      { status: 404 },
    );
  }
  if (!source.enabled) {
    return NextResponse.json(
      { success: false, error: 'API source is disabled' },
      { status: 400 },
    );
  }

  // Validate aspectRatio against the source's supported list
  let ratios: string[] = [];
  try {
    const p = JSON.parse(source.supportedAspectRatios);
    if (Array.isArray(p)) ratios = p.filter((v): v is string => typeof v === 'string');
  } catch {
    ratios = [];
  }
  let chosenRatio = aspectRatio;
  if (ratios.length > 0) {
    if (!chosenRatio || !ratios.includes(chosenRatio)) {
      chosenRatio = ratios.includes('auto') ? 'auto' : ratios[0];
    }
  }

  // Build callback URL
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/+$/, '');
  const callbackUrl = source.callbackSupported && siteUrl
    ? `${siteUrl}/api/callback/${source.id}`
    : '';

  // Create a pending task row first so we can correlate even if provider errors
  const initial = await prisma.imageTask.create({
    data: {
      apiSourceId: source.id,
      apiSourceName: source.name,
      prompt,
      aspectRatio: chosenRatio || null,
      status: 'pending',
    },
  });

  // Call provider
  const result = await runCreateTask(source, {
    prompt,
    aspectRatio: chosenRatio,
    callbackUrl,
  });

  if (!result.ok) {
    await prisma.imageTask.update({
      where: { id: initial.id },
      data: {
        status: 'failed',
        error: result.error || 'Provider error',
        rawResponse: result.rawResponse ? JSON.stringify(result.rawResponse).slice(0, 50_000) : null,
      },
    });
    return NextResponse.json(
      { success: false, error: result.error || 'Provider error' },
      { status: 502 },
    );
  }

  // Synchronous success: provider returned image immediately
  if (result.imageUrl && !result.taskId) {
    await prisma.imageTask.update({
      where: { id: initial.id },
      data: {
        status: 'success',
        imageUrl: result.imageUrl,
        rawResponse: JSON.stringify(result.rawResponse).slice(0, 50_000),
        taskId: `local_${initial.id}`,
      },
    });
    return NextResponse.json({
      success: true,
      taskId: `local_${initial.id}`,
      status: 'success',
      imageUrl: result.imageUrl,
    });
  }

  // Async: update with provider taskId
  await prisma.imageTask.update({
    where: { id: initial.id },
    data: {
      taskId: result.taskId,
      status: 'processing',
      imageUrl: result.imageUrl || null,
      rawResponse: JSON.stringify(result.rawResponse).slice(0, 50_000),
    },
  });

  return NextResponse.json({
    success: true,
    taskId: result.taskId,
    status: result.imageUrl ? 'success' : 'processing',
    imageUrl: result.imageUrl,
  });
}
