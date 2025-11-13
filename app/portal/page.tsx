'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Cliente = {
  id: string;
  user_id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  created_at: string;
};

export default function PortalPage() {
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);

      // 1) Usuario logueado
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) {
        router.push('/portal/login');
        return;
      }

      // 2) Traer TODOS los clientes (sin filtrar por user_id de momento)
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error(error);
        setError('No se pudieron cargar los clientes.');
      } else {
        setClientes(data || []);
      }

      setLoading(false);
    })();
  }, [router]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);

    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user) {
      setCreating(false);
      router.push('/portal/login');
      return;
    }

    // Llamamos a la API que ya tienes creada: /api/portal/create-client
    const res = await fetch('/api/portal/create-client', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre,
        email,
        telefono,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.error(body);
      setError(body.error || 'No se pudo crear el cliente.');
      setCreating(false);
      return;
    }

    const body = await res.json();
    const nuevo = body.cliente as Cliente;

    setClientes((prev) => [nuevo, ...prev]);
    setNombre('');
    setEmail('');
    setTelefono('');
    setCreating(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        Cargando panel…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 px-4 py-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <p className="text-xs text-emerald-400 uppercase tracking-wide">
              Panel interno · BKC Hipotecas
            </p>
            <h1 className="text-2xl font-semibold">Clientes de hipoteca</h1>
            <p className="text-xs text-slate-400">
              Desde aquí ves todos los clientes y accedes a su expediente.
            </p>
          </div>
        </header>

        {error && (
          <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/40 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {/* Formulario creación rápida */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-200">
            Nuevo cliente
          </h2>
          <form
            onSubmit={handleCreate}
            className="grid gap-3 md:grid-cols-[2fr,2fr,1.5fr,auto]"
          >
            <input
              required
              placeholder="Nombre"
              className="rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
            <input
              required
              type="email"
              placeholder="Email"
              className="rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              placeholder="Teléfono"
              className="rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
            />
            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-medium px-4 py-2 transition disabled:opacity-60"
            >
              {creating ? 'Creando…' : 'Guardar cliente'}
            </button>
          </form>
          <p className="text-[11px] text-slate-500">
            Más adelante podremos importar clientes desde Excel o desde tu CRM.
          </p>
        </div>

        {/* Listado de clientes */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200">
              Listado de clientes
            </h2>
            <span className="text-[11px] text-slate-500">
              {clientes.length} registro(s)
            </span>
          </div>

          {clientes.length === 0 ? (
            <p className="text-sm text-slate-400">
              Todavía no hay clientes creados. Empieza añadiendo uno con el formulario superior.
            </p>
          ) : (
            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-900/80">
                  <tr className="text-xs text-slate-400 text-left">
                    <th className="px-3 py-2">Nombre</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Teléfono</th>
                    <th className="px-3 py-2">Alta</th>
                    <th className="px-3 py-2 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {clientes.map((c) => (
                    <tr
                      key={c.id}
                      className="border-t border-slate-800 hover:bg-slate-900/60"
                    >
                      <td className="px-3 py-2 text-slate-100">{c.nombre}</td>
                      <td className="px-3 py-2 text-slate-300">{c.email}</td>
                      <td className="px-3 py-2 text-slate-300">
                        {c.telefono || '—'}
                      </td>
                      <td className="px-3 py-2 text-slate-400 text-xs">
                        {new Date(c.created_at).toLocaleDateString('es-ES')}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Link
                          href={`/portal/case/${c.id}`}
                          className="inline-flex items-center rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-50 px-3 py-1 transition"
                        >
                          Ver expediente
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-[11px] text-slate-500">
          Panel interno BKC Home · Gestión de hipotecas
        </p>
      </div>
    </div>
  );
}
