'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

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

    setLoading(true);

    try {
      // 1️⃣ Usuario logueado
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error(userError ?? 'Usuario no autenticado');
        setError(
          'No se ha podido obtener el usuario (userId). Vuelve a iniciar sesión e inténtalo de nuevo.'
        );
        return;
      }

      // 2️⃣ Crear cliente
      const { data: cliente, error: cliError } = await supabase
        .from('clientes')
        .insert({
          user_id: user.id,
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
        return;
      }

      // 3️⃣ Tokens para seguimiento
      const seguimientoToken =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      const publicToken =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      // 4️⃣ Crear expediente
      const { error: casoError } = await supabase.from('casos').insert({
        user_id: user.id,
        cliente_id: cliente.id, // 👈 nombre de columna en tu tabla
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
        return;
      }

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
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      {/* Barra superior */}
      <header className="border-b border-slate-800/70 bg-slate-950/60 backdrop-blur px-4 md:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/portal')}
            className="text-xs md:text-sm rounded-full border border-slate-700/70 px-3 py-1.5 hover:bg-slate-800/70 transition flex items-center gap-2"
          >
            <span className="text-lg leading-none">←</span>
            <span>Volver al panel</span>
          </button>
          <div className="hidden md:block">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              BKC HIPOTECAS
            </p>
            <p className="text-sm text-slate-300">
              Nuevo cliente · Nuevo expediente hipotecario
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Creando oportunidades inmobiliarias</span>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="px-4 md:px-6 py-10 flex justify-center">
        <div className="w-full max-w-xl">
          {/* Tarjeta principal */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl shadow-[0_18px_60px_rgba(0,0,0,0.65)] overflow-hidden">
            {/* Cabecera de la tarjeta */}
            <div className="px-6 md:px-8 pt-6 pb-4 border-b border-slate-800/60 flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 mb-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] font-semibold tracking-[0.16em] text-emerald-300 uppercase">
                    Paso 1 · Alta de cliente
                  </span>
                </div>
                <h1 className="text-xl md:text-2xl font-semibold">
                  Registra a tu nuevo cliente
                </h1>
                <p className="mt-1 text-xs md:text-sm text-slate-400">
                  Con solo estos datos creamos el cliente, el expediente
                  hipotecario y su enlace de seguimiento para que lo vea como
                  cliente BKC.
                </p>
              </div>
            </div>

            {/* Formulario */}
            <div className="px-6 md:px-8 py-6 space-y-5">
              {error && (
                <div className="rounded-lg border border-red-700/70 bg-red-950/70 px-4 py-3 text-sm text-red-100">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold tracking-[0.16em] text-slate-400 uppercase">
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full rounded-lg bg-slate-950/80 border border-slate-700/80 px-3.5 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/70 focus:border-emerald-500/40 transition"
                    placeholder="Ej.: Juan Pérez"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold tracking-[0.16em] text-slate-400 uppercase">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg bg-slate-950/80 border border-slate-700/80 px-3.5 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/70 focus:border-emerald-500/40 transition"
                    placeholder="cliente@correo.com"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold tracking-[0.16em] text-slate-400 uppercase">
                    Teléfono (opcional)
                  </label>
                  <input
                    type="tel"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    className="w-full rounded-lg bg-slate-950/80 border border-slate-700/80 px-3.5 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/70 focus:border-emerald-500/40 transition"
                    placeholder="+34 ..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 text-slate-950 text-sm font-semibold py-2.75 hover:bg-emerald-400 transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                      Creando cliente…
                    </>
                  ) : (
                    <>Crear cliente y expediente</>
                  )}
                </button>
              </form>

              <div className="pt-3 border-t border-slate-800/70 text-[11px] text-slate-500 flex flex-col gap-1.5">
                <p>
                  ✅ Los datos se guardan en{' '}
                  <span className="font-mono text-slate-300">clientes</span> y se
                  crea un expediente en{' '}
                  <span className="font-mono text-slate-300">casos</span>.
                </p>
                <p>
                  💡 Cada expediente genera un enlace de seguimiento único para tu
                  cliente, con la estética BKC Hipotecas.
                </p>
              </div>
            </div>
          </div>

          {/* Mini recordatorio motivacional */}
          <p className="mt-4 text-center text-[11px] text-slate-500">
            Cada cliente nuevo es una hipoteca más cerca de tus objetivos 🚀
          </p>
        </div>
      </main>
    </div>
  );
}
