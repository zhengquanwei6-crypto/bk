import { NextRequest, NextResponse } from 'next/server';
import { isAdminFromRequest } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/settings
 *
 * Reports whether expected env vars are configured (boolean only - never the
 * actual value), plus a list of api-key env names that the configured sources
 * expect.
 */
export async function GET(req: NextRequest) {
  if (!isAdminFromRequest(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const sources = await prisma.apiSource.findMany({
    select: { id: true, name: true, apiKeyEnvName: true, enabled: true, isDefault: true },
  });

  const apiKeyEnv: Array<{ envName: string; configured: boolean; usedBy: string[] }> = [];
  const map = new Map<string, string[]>();
  for (const s of sources) {
    if (!s.apiKeyEnvName) continue;
    const list = map.get(s.apiKeyEnvName) || [];
    list.push(s.name);
    map.set(s.apiKeyEnvName, list);
  }
  for (const [envName, usedBy] of map.entries()) {
    apiKeyEnv.push({ envName, configured: Boolean(process.env[envName]), usedBy });
  }

  return NextResponse.json({
    success: true,
    settings: {
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL || '',
      adminPasswordConfigured: Boolean(process.env.ADMIN_PASSWORD),
      sessionSecretConfigured: Boolean(process.env.SESSION_SECRET),
      ai: {
        provider: process.env.AI_PROVIDER || 'openai',
        openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
        openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        openaiBaseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      },
      apiKeyEnv,
      sourceCount: sources.length,
      enabledCount: sources.filter((s) => s.enabled).length,
      hasDefault: sources.some((s) => s.isDefault),
    },
  });
}
