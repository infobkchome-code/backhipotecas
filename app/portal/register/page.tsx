'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      // URL a la que volverá el usuario después de confirmar el email
      const origin =
        typeof window !== 'undefined'
          ? window.location.origin
          : 'https://backhipotecas.vercel.app';

      const redirectTo = `${origin}/portal`;

      const { error } = await supabase.auth.signUp({
        email,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (error) {
        setError(error.message);
      } else {
        setMessage(
          'Te hemos enviado un email de confirmación. Revisa tu bandeja de entrada y haz clic en el enlace para acceder al portal.'
        );
      }
    } catch (err: any) {
      setError('Ha ocurrido un error al crear el usuario.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">Crear usuario del portal</h1>
          <p className="text-sm text-slate-400">
            Este registro es solo para uso interno de BKC Hipotecas. Introduce tu correo y te enviaremos
            un enlace de acceso.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium text-slate-200">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="tucorreo@ejemplo.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed text-slate-950 text-sm font-medium px-4 py-2 transition"
          >
            {loading ? 'Enviando enlace…' : 'Crear usuario y enviar enlace'}
          </button>
        </form>

        {message && (
          <div className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/40 rounded-lg px-3 py-2">
            {message}
          </div>
        )}

        {error && (
          <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/40 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="text-sm text-slate-400 text-center">
          <span>¿Ya tienes usuario?</span>{' '}
          <Link href="/portal/login" className="text-emerald-400 hover:underline">
            Ir a iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
