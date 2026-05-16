/**
 * Tiny password-based admin auth using a signed cookie session.
 *
 * - Single admin (no users table): password from env ADMIN_PASSWORD
 * - Cookie value is HMAC-signed with SESSION_SECRET
 * - HTTP-only, SameSite=Lax, Secure in prod
 */
import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';

const COOKIE_NAME = 'aig_admin';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecret(): string {
  return process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || 'dev-only-fallback-secret-change-me';
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('hex');
}

function buildToken(): string {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = `admin.${exp}`;
  const sig = sign(payload);
  return `${payload}.${sig}`;
}

function verifyToken(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [role, expStr, sig] = parts;
  if (role !== 'admin') return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return false;

  const expected = sign(`${role}.${expStr}`);
  try {
    const a = Buffer.from(sig, 'hex');
    const b = Buffer.from(expected, 'hex');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function checkPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || expected.length === 0) return false;
  if (typeof input !== 'string' || input.length === 0) return false;
  // Constant-time compare with normalization
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function buildAdminCookieHeader(): { name: string; value: string; options: AdminCookieOptions } {
  return {
    name: COOKIE_NAME,
    value: buildToken(),
    options: defaultCookieOptions(),
  };
}

export function clearAdminCookieHeader(): { name: string; value: string; options: AdminCookieOptions } {
  return {
    name: COOKIE_NAME,
    value: '',
    options: { ...defaultCookieOptions(), maxAge: 0 },
  };
}

interface AdminCookieOptions {
  httpOnly: true;
  sameSite: 'lax';
  secure: boolean;
  path: '/';
  maxAge: number;
}

function defaultCookieOptions(): AdminCookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  };
}

/**
 * Read the cookie from the request (for route handlers that have NextRequest).
 */
export function isAdminFromRequest(req: NextRequest): boolean {
  const c = req.cookies.get(COOKIE_NAME)?.value;
  return verifyToken(c);
}

/**
 * Read the cookie via next/headers (for Server Components, RSC pages).
 */
export function isAdminFromCookies(): boolean {
  const c = cookies().get(COOKIE_NAME)?.value;
  return verifyToken(c);
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME;
