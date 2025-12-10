'use client';

import { FormEvent, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const redirectTo = searchParams.get('redirectTo') || '/portal';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error || !data.user) {
      setErrorMsg('Correo o contraseña incorrectos.');
      return;
    }

    router.push(redirectTo);
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-9 w-9 rounded-2xl bg-emerald-500 flex items-center justify-center text-slate-900 font-bold">
            BKC
          </div>
          <div>
            <div className="text-sm text-emerald-400 font-semibold">
              BKC Hipotecas
            </div>
            <div className="text-lg font-semibold text-white">
              Acceso al panel
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-300 mb-4">
          Introduce tu correo y contraseña para acceder al panel interno de expedientes hipotecarios.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-200 mb-1">
              Correo electrónico
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
              placeholder="tu@hipotecasbkc.es"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-200 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
              placeholder="••••••••"
            />
          </div>

          {errorMsg && (
            <div className="text-xs text-red-400 bg-red-950/50 border border-red-900 rounded-xl px-3 py-2">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-emerald-500 text-slate-900 text-sm font-semibold py-2.5 mt-2 disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {loading ? 'Entrando…' : 'Entrar al panel'}
          </button>
        </form>

        <p className="mt-4 text-[11px] text-slate-400">
          Acceso restringido al equipo de BKC Hipotecas.
        </p>
      </div>
    </div>
  );
}
