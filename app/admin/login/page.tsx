'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Login failed');
      router.replace('/admin');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm card p-6">
        <h1 className="text-lg font-semibold mb-1">Admin sign in</h1>
        <p className="text-sm text-gray-500 mb-5">
          Enter your admin password to manage API sources.
        </p>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="label" htmlFor="pw">Password</label>
            <input
              id="pw"
              type="password"
              autoComplete="current-password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
          </div>
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm px-3 py-2">
              {error}
            </div>
          )}
          <button type="submit" className="btn-primary w-full" disabled={submitting || !password}>
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <div className="mt-5 text-xs text-gray-400 text-center">
          <a href="/" className="hover:text-gray-700">← Back to site</a>
        </div>
      </div>
    </main>
  );
}
