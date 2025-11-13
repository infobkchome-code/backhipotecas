'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type Caso = {
  id: string;
  estado: string | null;
  progreso: number | null;
  created_at: string;
};

type Cliente = {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  created_at: string;
  casos: Caso[]; // relación 1..N (usaremos el primero)
};

export default function PortalPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'en_estudio' | 'cerrado'>('todos');

  const router = useRouter();

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        setError('Error de autenticación.');
        setLoading(false);
        return;
      }
      if (!user) {
        router.push('/portal/login');
        return;
      }

      // Traemos clientes + sus casos relacionados
      const { data, error } = await supabase
        .from('clientes')
        .select(`
          id,
          nombre,
          email,
          telefono,
          created_at,
          casos (
            id,
            estado,
            progreso,
            created_at
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error(error);
        setError('No se han podido cargar los clientes.');
      } else {
        setClientes((data as any) || []);
      }

      setLoading(false);
    })();
  }, [router]);

  const filtered = clientes.filter((c) => {
    const texto = (c.nombre + c.email + (c.telefono ?? '')).toLowerCase();
    const coincideTexto = texto.includes(filtroTexto.toLowerCase());

    const caso = c.casos?.[0]; // de momento asumimos un expediente por cliente
    const estado = caso?.estado ?? 'en_estudio';

    const coincideEstado =
      filtroEstado === 'todos' ? true : estado === filtroEstado;

    return coincideTexto && coincideEstado;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 px-6 py-4">
      <header className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-emerald-400">
            BKC HIPOTECAS · PANEL INTERNO
          </p>
          <h1 className="text-2xl font-semibold mt-1">
            Clientes y expedientes
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Desde aquí ves todos tus clientes y accedes a su expediente.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.refresh()}
            className="text-sm rounded-lg border border-slate-700 px-3 py-1.5 hover:bg-slate-800"
          >
            Refrescar
          </button>
          <Link
            href="/portal/clients/new"
            className="text-sm rounded-lg bg-emerald-500 text-slate-950 px-4 py-1.5 font-semibold hover:bg-emerald-400"
          >
            + Nuevo cliente
          </Link>
        </div>
      </header>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs text-emerald-400">
          ●{' '}
          {filtered.length === 1
            ? '1 cliente encontrado'
            : `${filtered.length} clientes encontrados`}
        </span>

        <div className="flex flex-wrap gap-2 ml-4">
          <button
            onClick={() => setFiltroEstado('todos')}
            className={`px-3 py-1 text-xs rounded-full border ${
              filtroEstado === 'todos'
                ? 'bg-emerald-500 text-slate-950 border-emerald-500'
                : 'border-slate-700 text-slate-300'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFiltroEstado('en_estudio')}
            className={`px-3 py-1 text-xs rounded-full border ${
              filtroEstado === 'en_estudio'
                ? 'bg-emerald-500 text-slate-950 border-emerald-500'
                : 'border-slate-700 text-slate-300'
            }`}
          >
            En estudio
          </button>
          <button
            onClick={() => setFiltroEstado('cerrado')}
            className={`px-3 py-1 text-xs rounded-full border ${
              filtroEstado === 'cerrado'
                ? 'bg-emerald-500 text-slate-950 border-emerald-500'
                : 'border-slate-700 text-slate-300'
            }`}
          >
            Cerrado
          </button>
        </div>

        <div className="ml-auto">
          <input
            type="text"
            value={filtroTexto}
            onChange={(e) => setFiltroTexto(e.target.value)}
            placeholder="Buscar por nombre, email o teléfono…"
            className="text-xs bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 w-64"
          />
        </div>
      </div>

      {/* Mensaje de error */}
      {error && (
        <div className="mb-3 rounded-lg border border-red-600/70 bg-red-950/60 px-4 py-2 text-xs text-red-100">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/90 border-b border-slate-800">
            <tr className="text-xs text-slate-400">
              <th className="text-left px-4 py-2">Cliente</th>
              <th className="text-left px-4 py-2">Contacto</th>
              <th className="text-left px-4 py-2">Fechas</th>
              <th className="text-left px-4 py-2">Expediente</th>
              <th className="text-left px-4 py-2">Progreso</th>
              <th className="text-left px-4 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-xs text-slate-400">
                  Cargando clientes…
                </td>
              </tr>
            )}

            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-xs text-slate-400">
                  No hay clientes con los filtros actuales.
                </td>
              </tr>
            )}

            {!loading &&
              filtered.map((c) => {
                const caso = c.casos?.[0] as Caso | undefined;
                const estado = caso?.estado ?? 'en_estudio';
                const progreso = caso?.progreso ?? 0;

                return (
                  <tr
                    key={c.id}
                    className="border-t border-slate-800/80 hover:bg-slate-900/80"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-sm">{c.nombre}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-300">
                      <div>{c.email}</div>
                      {c.telefono && <div className="text-slate-500">{c.telefono}</div>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      Alta:{' '}
                      {new Date(c.created_at).toLocaleDateString('es-ES')}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {caso ? (
                        <span className="inline-flex items-center rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-slate-200 border border-slate-700">
                          {estado === 'en_estudio' ? 'En estudio' : estado}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">
                          Sin expediente (se creará al subir documentación)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-300">
                      {progreso}%
                    </td>
                    <td className="px-4 py-3 text-right text-xs">
                      {caso ? (
                        <Link
                          href={`/portal/case/${caso.id}`}
                          className="inline-flex items-center rounded-lg bg-emerald-500 text-slate-950 px-3 py-1 font-semibold hover:bg-emerald-400 text-[11px]"
                        >
                          Ver expediente →
                        </Link>
                      ) : (
                        <span className="text-slate-500 text-[11px]">
                          (sin expediente)
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
