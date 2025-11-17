'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function NewClientPage() {
  const router = useRouter();

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!nombre.trim() || !email.trim()) {
      setError('Nombre y email son obligatorios.');
      return;
    }

    setLoading(true);

    try {
      // 🔹 Llamamos a la API del portal que crea cliente + expediente
      const res = await fetch('/api/portal/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre: nombre.trim(),
          email: email.trim(),
          telefono: telefono.trim() || null,
        }),
      });

      if (!res.ok) {
        let message =
          'No se ha podido crear el cliente y el expediente. Inténtalo de nuevo.';

        try {
          const data = await res.json();
          if (data?.error) message = data.error;
          if (data?.details) message = data.details;
        } catch {
          // ignoramos errores al parsear JSON
        }

        setError(message);
        return;
      }

      // ✅ Todo OK → volvemos al panel
      router.push('/portal');
    } catch (err) {
      console.error('Error llamando a /api/portal/create', err);
      setError(
        'Error de red creando el cliente. Revisa tu conexión e inténtalo de nuevo.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Nuevo cliente</h1>
          <p className="text-xs text-slate-400">
            Crea un cliente y automáticamente se generará su expediente
            hipotecario con enlace de seguimiento.
          </p>
        </div>

        {/* 🔙 Botón para volver al panel */}
        <button
          type="button"
          onClick={() => router.push('/portal')}
          className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 transition"
        >
          ← Volver al panel
        </button>
      </header>

      <main className="px-6 py-6 flex justify-center">
        <div className="w-full max-w-md bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-4">
          {error && (
            <div className="rounded-md border border-red-700 bg-red-950/50 px-4 py-2 text-sm text-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Nombre completo
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="Ej.: Juan Pérez"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="cliente@correo.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Teléfono (opcional)
              </label>
              <input
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="+34 ..."
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center rounded-md bg-emerald-500 text-slate-950 text-sm font-semibold py-2.5 hover:bg-emerald-400 transition disabled:opacity-60"
            >
              {loading ? 'Creando cliente…' : 'Crear cliente'}
            </button>

            <p className="text-[11px] text-slate-500 text-center">
              Los datos se guardan en Supabase en la tabla{' '}
              <span className="font-mono">clientes</span> y se crea un
              expediente en la tabla <span className="font-mono">casos</span>.
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
