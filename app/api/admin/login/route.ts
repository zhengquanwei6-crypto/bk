import { NextRequest, NextResponse } from 'next/server';
import { adminLoginSchema } from '@/lib/validators';
import { buildAdminCookieHeader, checkPassword } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = adminLoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }

  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json(
      { success: false, error: 'Server is missing ADMIN_PASSWORD env var' },
      { status: 500 },
    );
  }

  if (!checkPassword(parsed.data.password)) {
    // Add a small delay to discourage online brute-force attempts
    await new Promise((resolve) => setTimeout(resolve, 600));
    return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 });
  }

  const res = NextResponse.json({ success: true });
  const c = buildAdminCookieHeader();
  res.cookies.set(c.name, c.value, c.options);
  return res;
}
