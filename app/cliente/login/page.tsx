'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function ClienteLoginPage() {
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setMensaje(null);
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/cliente`,
      },
    });

    setEnviando(false);

    if (error) {
      console.error(error);
      setError('No se pudo enviar el email. Revisa que esté bien escrito.');
    } else {
      setMensaje('Te hemos enviado un enlace de acceso. Revisa tu correo.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-8 space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Acceso a tu expediente</h1>
          <p className="text-sm text-slate-400">
            Introduce el correo que nos diste para tu hipoteca. Te enviaremos un enlace seguro.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="tucorreo@ejemplo.com"
            />
          </div>

          <button
            type="submit"
            disabled={enviando}
            className="w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-medium py-2 text-sm transition disabled:opacity-60"
          >
            {enviando ? 'Enviando enlace…' : 'Recibir enlace de acceso'}
          </button>
        </form>

        {mensaje && (
          <div className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/40 rounded-lg px-3 py-2">
            {mensaje}
          </div>
        )}

        {error && (
          <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/40 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <p className="text-[11px] text-slate-500">
          Si tienes cualquier duda, contacta con BKC Home y te ayudamos a entrar.
        </p>
      </div>
    </div>
  );
}
