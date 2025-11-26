'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type LoginPageProps = {
  searchParams?: {
    redirectTo?: string;
  };
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  const router = useRouter();
  const redirectTo = searchParams?.redirectTo || '/portal';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Si ya hay sesión → saltar el login
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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Cabecera pequeña tipo marca */}
        <div className="flex items-center justify-center mb-6">
          <div className="flex items-center gap-3">
            <div
              className="h-9 w-9 rounded-full flex items-center justify-center text-slate-900 font-bold text-xs"
              style={{ background: '#e6f2df' }} // verde musgo muy suave
            >
              BKC
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-slate-900">
                Hipotecas BKC
              </div>
              <div className="text-[11px] text-slate-500">
                Panel interno · CRM Hipotecas
              </div>
            </div>
          </div>
        </div>

        {/* Tarjeta de login */}
        <div className="rounded-3xl bg-white border border-slate-200 shadow-soft p-7">
          <h1 className="text-lg font-semibold text-slate-900 mb-1">
            Acceso al panel
          </h1>
          <p className="text-[12px] text-slate-500 mb-5">
            Introduce tu correo y contraseña para acceder a los expedientes.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Correo electrónico
              </label>
              <input
                type="email"
                placeholder="tucorreo@hipotecasbkc.es"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Contraseña
              </label>
              <input
                type="password"
                placeholder="********"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-sm font-semibold py-2.5 mt-2 transition-colors"
            >
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
          </form>

          <p className="mt-4 text-[11px] text-slate-400 text-center">
            Acceso restringido. Uso interno de Hipotecas BKC.
          </p>
        </div>
      </div>
    </div>
  );
}
