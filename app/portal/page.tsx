'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

type Cliente = {
  id: string;
  nombre: string | null;
  email: string | null;
  telefono: string | null;
  created_at: string;
};

type Caso = {
  id: string;
  cliente_id: string;
  titulo: string | null;
  estado: string | null;
  progreso: number | null;
  notas: string | null;
  seguimiento_token: string | null;
};

type Fila = {
  cliente: Cliente;
  caso: Caso | null;
};

type Tab = 'todos' | 'en_estudio' | 'cerrado';

function formatearFecha(iso: string | null | undefined) {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES');
}

function formatearEstado(estado: string | null | undefined) {
  if (!estado) return 'EN_ESTUDIO';
  return estado.toUpperCase();
}

export default function PortalPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filas, setFilas] = useState<Fila[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [tab, setTab] = useState<Tab>('todos');

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      setError(null);

      try {
        // 1️⃣ Usuario logueado
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          console.error(userError ?? 'Usuario no autenticado');
          setError('Debes iniciar sesión para ver tus clientes.');
          setLoading(false);
          return;
        }

        // 2️⃣ Clientes del usuario
        const { data: clientes, error: cliError } = await supabase
          .from('clientes')
          .select('id, nombre, email, telefono, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (cliError) {
          console.error('Error cargando clientes:', cliError);
          setError('No se han podido cargar los clientes.');
          setLoading(false);
          return;
        }

        // 3️⃣ Casos del usuario
        const { data: casos, error: casoError } = await supabase
          .from('casos')
          .select(
            'id, cliente_id, titulo, estado, progreso, notas, seguimiento_token'
          )
          .eq('user_id', user.id);

        if (casoError) {
          console.error('Error cargando casos:', casoError);
          setError('No se han podido cargar los expedientes.');
          setLoading(false);
          return;
        }

        const mapaCasos = new Map<string, Caso>();
        (casos ?? []).forEach((c) => mapaCasos.set(c.cliente_id, c as Caso));

        const filasCompletas: Fila[] = (clientes ?? []).map((cl) => ({
          cliente: cl as Cliente,
          caso: mapaCasos.get(cl.id) ?? null,
        }));

        setFilas(filasCompletas);
      } catch (err: any) {
        console.error('Error inesperado cargando portal:', err);
        const msg =
          typeof err === 'string'
            ? err
            : err?.message
            ? err.message
            : JSON.stringify(err);
        setError(`Ha ocurrido un error inesperado: ${msg}`);
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, []);

  const filasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();

    return filas.filter(({ cliente, caso }) => {
      // 🔍 Búsqueda
      if (q) {
        const texto =
          `${cliente.nombre ?? ''} ${cliente.email ?? ''} ${
            cliente.telefono ?? ''
          } ${caso?.titulo ?? ''}`.toLowerCase();

        if (!texto.includes(q)) return false;
      }

      // 🏷️ Filtro por estado
      if (tab === 'en_estudio') {
        const e = (caso?.estado ?? 'EN_ESTUDIO').toUpperCase();
        return e === 'EN_ESTUDIO';
      }

      if (tab === 'cerrado') {
        const e = (caso?.estado ?? '').toUpperCase();
        return e.includes('CERRADO');
      }

      // 'todos'
      return true;
    });
  }, [filas, busqueda, tab]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* CABECERA */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col gap-2">
          <p className="text-[11px] uppercase tracking-[0.25em] text-emerald-400">
            BKC Hipotecas · Panel interno
          </p>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h1 className="text-xl md:text-2xl font-semibold">
                Clientes y expedientes (PRUEBA)
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Desde aquí ves todos tus clientes y accedes a su expediente.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="text-xs md:text-sm rounded-md border border-slate-700 px-3 py-1.5 hover:bg-slate-800 transition"
              >
                Refrescar
              </button>
              <Link
                href="/portal/clients/new"
                className="text-xs md:text-sm rounded-md bg-emerald-500 text-slate-950 px-3 py-1.5 font-semibold hover:bg-emerald-400 transition"
              >
                + Nuevo cliente
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        {/* Filtros y buscador */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="inline-flex items-center rounded-full border border-slate-800 bg-slate-950/60 p-1 text-xs">
            <button
              type="button"
              onClick={() => setTab('todos')}
              className={`px-3 py-1 rounded-full ${
                tab === 'todos'
                  ? 'bg-slate-800 text-slate-50'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setTab('en_estudio')}
              className={`px-3 py-1 rounded-full ${
                tab === 'en_estudio'
                  ? 'bg-slate-800 text-slate-50'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              En estudio
            </button>
            <button
              type="button"
              onClick={() => setTab('cerrado')}
              className={`px-3 py-1 rounded-full ${
                tab === 'cerrado'
                  ? 'bg-slate-800 text-slate-50'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              Cerrado
            </button>
          </div>

          <div className="w-full md:w-80">
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, email o teléfono…"
              className="w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* ESTADO / ERRORES */}
        {error && (
          <div className="rounded-md border border-red-700 bg-red-950/60 px-4 py-2 text-sm text-red-100">
            {error}
          </div>
        )}

        {loading && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-6 text-sm text-slate-300">
            Cargando clientes y expedientes…
          </div>
        )}

        {!loading && !error && filasFiltradas.length === 0 && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-6 text-sm text-slate-400">
            No hay clientes con los filtros actuales.
          </div>
        )}

        {/* TABLA PRINCIPAL */}
        {!loading && !error && filasFiltradas.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900/70 border-b border-slate-800 text-xs text-slate-400">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Cliente</th>
                  <th className="px-4 py-2 text-left font-medium">Contacto</th>
                  <th className="px-4 py-2 text-left font-medium">Fechas</th>
                  <th className="px-4 py-2 text-left font-medium">Expediente</th>
                  <th className="px-4 py-2 text-left font-medium">Progreso</th>
                  <th className="px-4 py-2 text-left font-medium">
                    Observaciones
                  </th>
                  <th className="px-4 py-2 text-left font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/80">
                {filasFiltradas.map(({ cliente, caso }) => {
                  const progreso = caso?.progreso ?? 0;
                  const estado = formatearEstado(caso?.estado);

                  return (
                    <tr key={cliente.id} className="hover:bg-slate-900/60">
                      <td className="px-4 py-3 align-top">
                        <div className="font-medium text-slate-50">
                          {cliente.nombre || 'Sin nombre'}
                        </div>
                      </td>

                      <td className="px-4 py-3 align-top text-slate-300">
                        <div>{cliente.email}</div>
                        {cliente.telefono && (
                          <div className="text-xs text-slate-500">
                            {cliente.telefono}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 align-top text-slate-300">
                        <div className="text-xs text-slate-400">Alta:</div>
                        <div>{formatearFecha(cliente.created_at)}</div>
                      </td>

                      <td className="px-4 py-3 align-top text-slate-300">
                        <div className="font-medium">
                          {caso?.titulo || 'Expediente sin título'}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          Estado: {estado}
                        </div>
                      </td>

                      <td className="px-4 py-3 align-top text-slate-300">
                        <div className="flex items-center gap-2">
                          <span>{progreso}%</span>
                          <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-emerald-500"
                              style={{
                                width: `${Math.min(
                                  Math.max(progreso, 0),
                                  100
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 align-top text-slate-300">
                        <span className="text-xs">
                          {caso?.notas || 'Expediente creado automáticamente.'}
                        </span>
                      </td>

                      <td className="px-4 py-3 align-top text-xs">
                        <div className="flex flex-col gap-1">
                          {caso && (
                            <Link
                              href={`/portal/case/${caso.id}`}
                              className="text-emerald-400 hover:text-emerald-300 underline-offset-2 hover:underline"
                            >
                              Ver expediente →
                            </Link>
                          )}

                          {caso?.seguimiento_token ? (
                            <Link
                              href={`/seguimiento/${caso.seguimiento_token}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-400 hover:text-emerald-300 underline-offset-2 hover:underline"
                            >
                              Ver como cliente →
                            </Link>
                          ) : (
                            <span className="text-slate-500">
                              Sin enlace de seguimiento
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
