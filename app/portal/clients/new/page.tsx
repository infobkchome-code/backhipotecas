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
      // 1️⃣ Conseguimos el usuario logueado
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError('Debes iniciar sesión para crear clientes.');
        setLoading(false);
        return;
      }

      // 2️⃣ Creamos el cliente en la tabla "clientes"
      const { data: cliente, error: cliError } = await supabase
        .from('clientes')
        .insert({
          userId: user.id, // 👈 CORREGIDO
          nombre: nombre.trim(),
          email: email.trim(),
          telefono: telefono.trim() || null,
        })
        .select('id, nombre, email')
        .single();

      if (cliError) {
        console.error(cliError);
        setError('No se ha podido crear el cliente.');
        setLoading(false);
        return;
      }

      // 3️⃣ Generamos tokens para el expediente
      const seguimientoToken = crypto.randomUUID();
      const publicToken = crypto.randomUUID();

      // 4️⃣ Creamos un expediente inicial en la tabla "casos"
      const { error: casoError } = await supabase.from('casos').insert({
        userId: user.id, // 👈 CORREGIDO
        client_id: cliente.id,
        titulo: `Expediente ${cliente.nombre}`,
        estado: 'en_estudio',
        progreso: 0,
        notas: 'Expediente creado automáticamente.',
        email: cliente.email,
        public_token: publicToken,
        seguimiento_token: seguimientoToken,
      });

      if (casoError) {
        console.error(casoError);
        setError(
          'El cliente se ha creado, pero ha fallado la creación del expediente.',
        );
        setLoading(false);
        return;
      }

      // 5️⃣ Todo OK → volvemos al panel
      router.push('/portal');
    } catch (err: any) {
      console.error(err);
      setError('Error inesperado creando cliente.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="border-b border-slate-800 px-6 py-4">
        <h1 className="text-xl font-semibold">Nuevo cliente</h1>
        <p className="text-xs text-slate-400">
          Crea un cliente y automáticamente se generará su expediente
          hipotecario con enlace de seguimiento.
        </p>
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

           <header className="border-b border-slate-800 px-6 py-4">
  <h1 className="text-xl font-semibold">Nuevo cliente</h1>
  <p className="text-xs text-slate-400">
    Crea un cliente y automáticamente se generará su expediente hipotecario con enlace de seguimiento.
  </p>
</header>

<button
  type="button"
  onClick={() => router.back()}
  className="ml-6 mt-4 text-sm text-slate-400 hover:text-slate-200 transition"
>
  ← Volver atrás
</button>

<main className="px-6 py-6 flex justify-center">

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
