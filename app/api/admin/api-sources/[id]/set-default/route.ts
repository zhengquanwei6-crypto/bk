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

  await prisma.$transaction([
    prisma.apiSource.updateMany({ where: { isDefault: true }, data: { isDefault: false } }),
    prisma.apiSource.update({ where: { id: params.id }, data: { isDefault: true, enabled: true } }),
  ]);

  return NextResponse.json({ success: true });
}
