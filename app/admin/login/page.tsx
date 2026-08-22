'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setError('Incorrect password.');
        setLoading(false);
        return;
      }
      router.push('/admin/orders');
    } catch {
      setError("Couldn't sign in. Check your connection and try again.");
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-24">
      <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-scan">Admin</p>
      <h1 className="font-display text-3xl font-medium text-ink">Sign in</h1>
      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">Password</span>
          <input
            aria-label="Password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="mt-1.5 w-full border-b border-line bg-transparent py-1.5 text-[15px] text-ink focus:border-scan focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-scan"
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-[#b3452c]">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-ink px-6 py-3 font-medium text-paper transition-colors hover:bg-ink/90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-scan"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
