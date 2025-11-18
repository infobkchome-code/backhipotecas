'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

// ⚠️ Este es tu user_id de Supabase (el mismo que ves en la columna user_id)
const FIXED_USER_ID = '7efac488-1535-4784-b888-79554da1b5d5';

type CasoRow = {
  id: string;
  titulo: string | null;
  estado: string | null;
  progreso: number | null;
  created_at: string;
  email: string | null;
  seguimiento_token: string | null;
};

export default function PortalPage() {
  const [casos, setCasos] = useState<CasoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<'todos' | 'en_estudio' | 'cerrado'>(
    'todos'
  );

  const cargarCasos = async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from('casos')
      .select(
        'id, titulo, estado, progreso, created_at, email, seguimiento_token'
      )
      .eq('user_id', FIXED_USER_ID)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error cargando casos:', error);
      setError('No se han podido cargar los expedientes.');
      setCasos([]);
    } else {
      setCasos(data ?? []);
    }

    setLoading(false);
  };

  useEffect(() => {
    cargarCasos();
  }, []);

  const casosFiltrados = casos.filter((c) => {
    if (filtro === 'todos') return true;
    if (filtro === 'en_estudio') return c.estado === 'en_estudio';
    if (filtro === 'cerrado') return c.estado === 'cerrado';
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* Cabecera */}
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg md:text-xl font-semibold">
            Clientes y expedientes
          </h1>
          <p className="text-xs text-slate-400">
            Aquí ves todos tus expedientes hipotecarios y su estado.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={cargarCasos}
            className="rounded-md border border-slate-700 px-3 py-1.5 text-xs md:text-sm hover:bg-slate-800 transition"
          >
            Refrescar
          </button>

          <Link
            href="/portal/clients/new"
            className="rounded-md bg-emerald-500 px-3 py-1.5 text-xs md:text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition"
          >
            + Nuevo cliente
          </Link>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="px-6 py-6">
        {/* Error global */}
        {error && (
          <div className="mb-4 rounded-md border border-red-700 bg-red-950/50 px-4 py-2 text-sm text-red-100">
            {error}
          </div>
        )}

        {/* Filtros */}
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs md:text-sm">
          <span className="text-slate-400 mr-2">Expedientes encontrados</span>
          <button
            type="button"
            onClick={() => setFiltro('todos')}
            className={`rounded-full px-3 py-1 border ${
              filtro === 'todos'
                ? 'bg-slate-100 text-slate-900 border-slate-100'
                : 'border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => setFiltro('en_estudio')}
            className={`rounded-full px-3 py-1 border ${
              filtro === 'en_estudio'
                ? 'bg-slate-100 text-slate-900 border-slate-100'
                : 'border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            En estudio
          </button>
          <button
            type="button"
            onClick={() => setFiltro('cerrado')}
            className={`rounded-full px-3 py-1 border ${
              filtro === 'cerrado'
                ? 'bg-slate-100 text-slate-900 border-slate-100'
                : 'border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            Cerrado
          </button>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
          <table className="min-w-full text-xs md:text-sm">
            <thead className="bg-slate-900/70 text-slate-300">
              <tr>
                <th className="px-4 py-2 text-left">Cliente / expediente</th>
                <th className="px-4 py-2 text-left">Contacto</th>
                <th className="px-4 py-2 text-left">Fecha creación</th>
                <th className="px-4 py-2 text-left">Estado</th>
                <th className="px-4 py-2 text-left">Progreso</th>
                <th className="px-4 py-2 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-slate-400"
                  >
                    Cargando expedientes…
                  </td>
                </tr>
              )}

              {!loading && casosFiltrados.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-slate-400"
                  >
                    No hay expedientes con los filtros actuales.
                  </td>
                </tr>
              )}

              {!loading &&
                casosFiltrados.map((caso) => (
                  <tr
                    key={caso.id}
                    className="border-t border-slate-800 hover:bg-slate-900/40"
                  >
                    <td className="px-4 py-2">
                      <div className="font-medium text-slate-50">
                        {caso.titulo ?? 'Expediente sin título'}
                      </div>
                      {caso.seguimiento_token && (
                        <div className="text-[11px] text-slate-500">
                          Código seguimiento:{' '}
                          <span className="font-mono">
                            {caso.seguimiento_token}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-slate-300">
                      {caso.email ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-slate-300">
                      {new Date(caso.created_at).toLocaleDateString('es-ES')}
                    </td>
                    <td className="px-4 py-2">
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] uppercase tracking-wide text-slate-200">
                        {caso.estado ?? 'sin estado'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-300">
                      {caso.progreso ?? 0}%
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/portal/case/${caso.id}`}
                          className="rounded-md border border-slate-700 px-2 py-1 text-[11px] hover:bg-slate-800"
                        >
                          Ver expediente
                        </Link>
                        {caso.seguimiento_token && (
                          <Link
                            href={`/seguimiento/${caso.seguimiento_token}`}
                            className="rounded-md border border-slate-700 px-2 py-1 text-[11px] hover:bg-slate-800"
                          >
                            Ver como cliente
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
