'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // si usabas callbackUrl / next / redirectTo, aquí lo normalizamos
  const redirectTo = useMemo(() => {
    const next = searchParams.get('next') || searchParams.get('redirectTo');
    if (!next) return '/portal';
    // evita redirects raros externos
    if (!next.startsWith('/')) return '/portal';
    return next;
  }, [searchParams]);

  useEffect(() => {
    // si ya está logueado, fuera
    const check = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) router.replace(redirectTo);
    };
    check();
  }, [router, redirectTo]);

  const handleLogin = async () => {
    setMsg(null);
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data?.user) {
        setMsg(error?.message || 'No se pudo iniciar sesión.');
        return;
      }

      router.replace(redirectTo);
    } catch {
      setMsg('Error inesperado al iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold">Acceso al portal</h1>
          <p className="text-xs text-slate-500">
            Inicia sesión para ver tus expedientes.
          </p>
        </div>

        {msg && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {msg}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              autoComplete="current-password"
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleLogin();
              }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogin}
          disabled={loading || !email || !password}
          className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Entrando…' : 'Entrar'}
        </button>

        <div className="flex items-center justify-between text-xs text-slate-500">
          <Link href="/" className="hover:underline">
            ← Volver
          </Link>
          <span className="text-[11px]">
            Redirección: <span className="font-medium">{redirectTo}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
