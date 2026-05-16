import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminFromRequest } from '@/lib/admin-auth';
import { apiSourceUpsertSchema, normalizeBodyTemplate } from '@/lib/validators';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminFromRequest(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const row = await prisma.apiSource.findUnique({ where: { id: params.id } });
  if (!row) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  return NextResponse.json({
    success: true,
    item: {
      ...row,
      requestBodyTemplate: safeJson(row.requestBodyTemplate),
      supportedAspectRatios: safeJsonArray(row.supportedAspectRatios),
      apiKeyEnvConfigured: row.apiKeyEnvName ? Boolean(process.env[row.apiKeyEnvName]) : null,
    },
  });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminFromRequest(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const exists = await prisma.apiSource.findUnique({ where: { id: params.id } });
  if (!exists) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

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

  const updated = await prisma.$transaction(async (tx) => {
    if (data.isDefault) {
      await tx.apiSource.updateMany({
        where: { isDefault: true, NOT: { id: params.id } },
        data: { isDefault: false },
      });
    }
    return tx.apiSource.update({
      where: { id: params.id },
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

  return NextResponse.json({ success: true, item: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminFromRequest(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const exists = await prisma.apiSource.findUnique({ where: { id: params.id } });
  if (!exists) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  await prisma.apiSource.delete({ where: { id: params.id } });

  // If we just deleted the default, promote any other enabled source to default.
  if (exists.isDefault) {
    const next = await prisma.apiSource.findFirst({
      where: { enabled: true },
      orderBy: { createdAt: 'asc' },
    });
    if (next) {
      await prisma.apiSource.update({ where: { id: next.id }, data: { isDefault: true } });
    }
  }

  return NextResponse.json({ success: true });
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
