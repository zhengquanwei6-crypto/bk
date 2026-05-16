import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminFromRequest } from '@/lib/admin-auth';
import { apiSourceUpsertSchema, normalizeBodyTemplate } from '@/lib/validators';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/api-sources
 * List all sources (full fields, except API keys are never stored here).
 */
export async function GET(req: NextRequest) {
  if (!isAdminFromRequest(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const rows = await prisma.apiSource.findMany({
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  });

  const items = rows.map((r) => ({
    ...r,
    requestBodyTemplate: safeJson(r.requestBodyTemplate),
    supportedAspectRatios: safeJsonArray(r.supportedAspectRatios),
    apiKeyEnvConfigured: r.apiKeyEnvName ? Boolean(process.env[r.apiKeyEnvName]) : null,
  }));

  return NextResponse.json({ success: true, items });
}

/**
 * POST /api/admin/api-sources
 * Create a new API source. If isDefault=true, demote others first.
 */
export async function POST(req: NextRequest) {
  if (!isAdminFromRequest(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = apiSourceUpsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues.map((i) => i.message).join('; ') || 'Invalid' },
      { status: 400 },
    );
  }
  const data = parsed.data;

  let bodyTemplate: string;
  try {
    bodyTemplate = normalizeBodyTemplate(data.requestBodyTemplate);
  } catch (e) {
    return NextResponse.json(
      { success: false, error: `Invalid requestBodyTemplate: ${(e as Error).message}` },
      { status: 400 },
    );
  }

  const created = await prisma.$transaction(async (tx) => {
    if (data.isDefault) {
      await tx.apiSource.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
    }
    return tx.apiSource.create({
      data: {
        name: data.name,
        provider: data.provider,
        docUrl: data.docUrl,
        baseUrl: data.baseUrl,
        endpoint: data.endpoint,
        method: data.method,
        authType: data.authType,
        apiKeyEnvName: data.apiKeyEnvName,
        model: data.model,
        requestContentType: data.requestContentType,
        requestBodyTemplate: bodyTemplate,
        promptFieldPath: data.promptFieldPath,
        aspectRatioFieldPath: data.aspectRatioFieldPath,
        taskIdPath: data.taskIdPath,
        imageUrlPath: data.imageUrlPath,
        callbackSupported: data.callbackSupported,
        callbackUrlFieldPath: data.callbackUrlFieldPath,
        pollingSupported: data.pollingSupported,
        statusEndpoint: data.statusEndpoint,
        statusMethod: data.statusMethod,
        statusTaskIdParam: data.statusTaskIdParam,
        statusPath: data.statusPath,
        successStatusValue: data.successStatusValue,
        failedStatusValue: data.failedStatusValue,
        errorMessagePath: data.errorMessagePath,
        supportedAspectRatios: JSON.stringify(data.supportedAspectRatios),
        notes: data.notes,
        enabled: data.enabled,
        isDefault: data.isDefault,
      },
    });
  });

  return NextResponse.json({ success: true, item: created });
}

function safeJson(s: string): unknown {
  try { return JSON.parse(s); } catch { return null; }
}
function safeJsonArray(s: string): string[] {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch { return []; }
}
