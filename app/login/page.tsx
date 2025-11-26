'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage({ searchParams }: { searchParams?: { redirectTo?: string } }) {
  const router = useRouter();
  const redirectTo = searchParams?.redirectTo || '/portal';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Si ya hay sesión → no mostrar el login
  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        router.replace(redirectTo);
      }
    };
    check();
  }, [router, redirectTo]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error || !data?.user) {
      setError('Correo o contraseña incorrectos');
      return;
    }

    router.push(redirectTo);
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 shadow-xl p-8">
        <h1 className="text-xl font-bold text-emerald-400 mb-4">BKC Hipotecas</h1>
        <p className="text-sm text-slate-300 mb-4">Acceso al panel interno</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Correo electrónico"
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Contraseña"
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />

          {error && (
            <div className="text-xs text-red-400 bg-red-950 border border-red-800 rounded-xl px-2 py-1">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-emerald-500 text-slate-900 text-sm font-semibold py-2"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
