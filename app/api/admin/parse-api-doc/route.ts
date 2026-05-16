import { NextRequest, NextResponse } from 'next/server';
import { isAdminFromRequest } from '@/lib/admin-auth';
import { parseApiDocSchema } from '@/lib/validators';
import { fetchAndCleanDoc } from '@/lib/api-doc-parser';
import { parseDocWithAi } from '@/lib/ai-agent';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
  const parsed = parseApiDocSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message || 'Invalid docUrl' },
      { status: 400 },
    );
  }

  try {
    const doc = await fetchAndCleanDoc(parsed.data.docUrl);
    const result = await parseDocWithAi(doc);
    return NextResponse.json({
      success: true,
      apiSource: result.apiSource,
      warnings: result.warnings,
    });
  } catch (e) {
    const msg = (e as Error).message || 'Failed to parse doc';
    // Avoid leaking env var values in errors
    const safe = msg.replace(/Bearer\s+[^\s"']+/gi, 'Bearer ***');
    return NextResponse.json({ success: false, error: safe }, { status: 502 });
  }
}
