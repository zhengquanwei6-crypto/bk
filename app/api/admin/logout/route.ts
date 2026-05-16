import { NextResponse } from 'next/server';
import { clearAdminCookieHeader } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const res = NextResponse.json({ success: true });
  const c = clearAdminCookieHeader();
  res.cookies.set(c.name, c.value, c.options);
  return res;
}
