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
    setLoading(true);

    // 1) Usuario autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      setError('Error al obtener el usuario autenticado.');
      setLoading(false);
      return;
    }

    if (!user) {
      setError('Usuario no autenticado.');
      setLoading(false);
      return;
    }

    // 2) Insertar cliente con user_id = user.id
    const { data: cliente, error: insertError } = await supabase
      .from('clientes')
      .insert([
        {
          user_id: user.id,                // 👈 CLAVE PARA PASAR LA RLS
          nombre: nombre.trim(),
          email: email.trim(),
          telefono: telefono.trim() || null,
        },
      ])
      .select()
      .single();

    if (insertError || !cliente) {
      console.error(insertError);
      setError(insertError?.message || 'No se pudo crear el cliente.');
      setLoading(false);
      return;
    }

    // 3) Crear caso inicial para este cliente (opcional, pero útil)
    const { error: casoError } = await supabase.from('casos').insert([
      {
        user_id: user.id,
        cliente_id: cliente.id,
        titulo: `Expediente ${cliente.nombre}`,
        estado: 'en_estudio',
        progreso: 0,
        notas: 'Expediente creado automáticamente.',
      },
    ]);

    if (casoError) {
      console.error(casoError);
      // No bloqueamos al usuario, solo avisar si quieres
    }

    setLoading(false);

    // 4) Volver al panel principal
    router.push('/portal');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
      <div className="max-w-lg w-full space-y-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-emerald-400">
            Panel hipotecas BKC
          </p>
          <h1 className="text-2xl font-semibold mt-1">Nuevo cliente</h1>
          <p className="text-sm text-slate-400 mt-1">
            Crea un cliente para hacer el seguimiento de su hipoteca (casos, documentos, mensajes…).
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200">
              Nombre completo
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Ej. Juan Pérez"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="cliente@correo.com"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200">
              Teléfono
            </label>
            <input
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Ej. 600123123"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-950/50 border border-red-600/60 px-3 py-2 text-xs text-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center rounded-lg bg-emerald-500 text-slate-950 text-sm font-semibold py-2.5 hover:bg-emerald-400 transition disabled:opacity-60"
          >
            {loading ? 'Creando cliente…' : 'Crear cliente'}
          </button>

          <p className="text-[11px] text-slate-500 text-center">
            Los datos se guardan en Supabase en la tabla <span className="font-mono">clientes</span>, 
            asociados a tu usuario de BKC (<span className="font-mono">auth.users</span>).
          </p>
        </form>
      </div>
    </div>
  );
}
