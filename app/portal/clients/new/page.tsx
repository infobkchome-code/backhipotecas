'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

// 👇 IMPORTANTE: aquí ya has puesto tu user_id REAL de Supabase
const FIXED_USER_ID = '7efac488-1535-4784-b888-79554da1b5d5';

export default function NewClientPage() {
  const router = useRouter();

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!nombre.trim() || !email.trim()) {
      setError('Nombre y email son obligatorios.');
      return;
    }

    if (!FIXED_USER_ID || FIXED_USER_ID.startsWith('PON_AQUI')) {
      setError(
        'Falta configurar el FIXED_USER_ID en el código. Habla con Lex 😉'
      );
      return;
    }

    setLoading(true);

    try {
      // 1️⃣ Creamos el cliente en la tabla "clientes"
      const { data: cliente, error: cliError } = await supabase
        .from('clientes')
        .insert({
          user_id: FIXED_USER_ID,
          nombre: nombre.trim(),
          email: email.trim(),
          telefono: telefono.trim() || null,
        })
        .select('id, nombre, email')
        .single();

      if (cliError || !cliente) {
        console.error('Error creando cliente:', cliError);
        setError(
          `No se ha podido crear el cliente. Detalle: ${
            cliError?.message ?? 'sin detalle'
          }`
        );
        setLoading(false);
        return;
      }

      // 2️⃣ Generamos tokens para el expediente
      const seguimientoToken =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      const publicToken =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      // 3️⃣ Creamos el expediente en la tabla "casos"
      const { error: casoError } = await supabase.from('casos').insert({
        user_id: FIXED_USER_ID,
        // 👇 AQUÍ ESTABA EL FALLO: antes poníamos client_id
        cliente_id: cliente.id,
        titulo: `Expediente ${cliente.nombre}`,
        estado: 'en_estudio',
        progreso: 0,
        notas: 'Expediente creado automáticamente.',
        email: cliente.email,
        public_token: publicToken,
        seguimiento_token: seguimientoToken,
      });

      if (casoError) {
        console.error('Error creando caso:', casoError);
        setError(
          'El cliente se ha creado, pero ha fallado la creación del expediente.'
        );
        setLoading(false);
        return;
      }

      // 4️⃣ Todo OK → volvemos al panel
      router.push('/portal');
    } catch (err: any) {
      console.error('Error inesperado creando cliente:', err);

      const msg =
        typeof err === 'string'
          ? err
          : err?.message
          ? err.message
          : JSON.stringify(err);

      setError(`Error inesperado: ${msg}`);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center gap-4">
        {/* 👈 Botón de volver atrás */}
        <button
          type="button"
          onClick={() => router.push('/portal')}
          className="text-xs md:text-sm rounded-md border border-slate-700 px-3 py-1 hover:bg-slate-800 transition"
        >
          ← Volver al panel
        </button>

        <div>
          <h1 className="text-xl font-semibold">Nuevo cliente</h1>
          <p className="text-xs text-slate-400">
            Crea un cliente y automáticamente se generará su expediente
            hipotecario con enlace de seguimiento.
          </p>
        </div>
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
