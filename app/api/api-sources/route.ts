import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/api-sources
 * Returns enabled API sources with only public-safe fields.
 */
export async function GET() {
  try {
    const rows = await prisma.apiSource.findMany({
      where: { enabled: true },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        name: true,
        provider: true,
        model: true,
        supportedAspectRatios: true,
        isDefault: true,
      },
    });

    const items = rows.map((r) => {
      let ratios: string[] = [];
      try {
        const parsed = JSON.parse(r.supportedAspectRatios);
        if (Array.isArray(parsed)) ratios = parsed.filter((v) => typeof v === 'string');
      } catch {
        ratios = [];
      }
      return {
        id: r.id,
        name: r.name,
        provider: r.provider,
        model: r.model,
        supportedAspectRatios: ratios,
        isDefault: r.isDefault,
      };
    });

    return NextResponse.json({ success: true, items });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: 'Failed to load API sources' },
      { status: 500 },
    );
  }
}
