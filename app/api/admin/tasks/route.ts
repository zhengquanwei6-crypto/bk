import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminFromRequest } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/tasks?limit=50&cursor=<id>&status=&apiSourceId=
 */
export async function GET(req: NextRequest) {
  if (!isAdminFromRequest(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get('limit')) || 50, 200);
  const status = searchParams.get('status') || undefined;
  const apiSourceId = searchParams.get('apiSourceId') || undefined;
  const cursor = searchParams.get('cursor') || undefined;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (apiSourceId) where.apiSourceId = apiSourceId;

  const rows = await prisma.imageTask.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > limit;
  const items = (hasMore ? rows.slice(0, limit) : rows).map((r) => ({
    id: r.id,
    taskId: r.taskId,
    apiSourceId: r.apiSourceId,
    apiSourceName: r.apiSourceName,
    status: r.status,
    prompt: r.prompt,
    aspectRatio: r.aspectRatio,
    imageUrl: r.imageUrl,
    error: r.error,
    rawResponse: tryParse(r.rawResponse),
    rawCallback: tryParse(r.rawCallback),
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));

  return NextResponse.json({
    success: true,
    items,
    nextCursor: hasMore ? items[items.length - 1]?.id : null,
  });
}

function tryParse(v: string | null | undefined): unknown {
  if (!v) return null;
  try { return JSON.parse(v); } catch { return v; }
}
