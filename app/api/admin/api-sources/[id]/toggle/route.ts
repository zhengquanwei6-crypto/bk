import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminFromRequest } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminFromRequest(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const exists = await prisma.apiSource.findUnique({ where: { id: params.id } });
  if (!exists) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  const updated = await prisma.apiSource.update({
    where: { id: params.id },
    data: {
      enabled: !exists.enabled,
      // If we just disabled the default, also unmark default.
      isDefault: exists.enabled ? false : exists.isDefault,
    },
  });

  // Make sure at least one default still exists if any source is enabled
  if (!updated.enabled && updated.isDefault === false && exists.isDefault) {
    const next = await prisma.apiSource.findFirst({
      where: { enabled: true },
      orderBy: { createdAt: 'asc' },
    });
    if (next) {
      await prisma.apiSource.update({ where: { id: next.id }, data: { isDefault: true } });
    }
  }

  return NextResponse.json({ success: true, item: updated });
}
