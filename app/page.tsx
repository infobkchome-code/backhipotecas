'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type Caso = {
  id: string;
  titulo: string | null;
  estado: string | null;
  progreso: number | null;
  notas: string | null;
  created_at: string;
  updated_at: string | null;
};

type Cliente = {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  created_at: string;
  casos: Caso[];
};

type EstadoFiltro =
  | 'todos'
  | 'en_estudio'
  | 'documentacion_pendiente'
  | 'en_banco'
  | 'preaprobado'
  | 'fein'
  | 'tasacion'
  | 'aprobado_final'
  | 'firma'
  | 'cerrado';

const ESTADO_LABELS: Record<string, string> = {
  en_estudio: 'En estudio',
  documentacion_pendiente: 'Doc. pendiente',
  en_banco: 'En banco',
  preaprobado: 'Preaprobado',
  fein: 'FEIN',
  tasacion: 'Tasación',
  aprobado_final: 'Aprobado final',
  firma: 'Firma',
  cerrado: 'Cerrado',
};

const ESTADO_COLORS: Record<string, string> = {
  en_estudio: 'bg-sky-100 text-sky-800 border-sky-200',
  documentacion_pendiente: 'bg-amber-100 text-amber-800 border-amber-200',
  en_banco: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  preaprobado: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  fein: 'bg-purple-100 text-purple-800 border-purple-200',
  tasacion: 'bg-blue-100 text-blue-800 border-blue-200',
  aprobado_final: 'bg-green-100 text-green-800 border-green-200',
  firma: 'bg-teal-100 text-teal-800 border-teal-200',
  cerrado: 'bg-zinc-200 text-zinc-800 border-zinc-300',
};

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}

function formatCurrency(n?: number | null) {
  if (!n || n <= 0) return '—';
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);
}

export default function PortalPage() {
  const router = useRouter();
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [search, setSearch] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>('todos');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 1) Comprobar usuario autenticado (solo tú)
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        router.push('/portal/login');
        return;
      }

      // Si quisieras limitar solo a tu correo:
      // if (data.user.email !== 'nahuelbritos@icloud.com') {
      //   router.push('/portal/login');
      //   return;
      // }

      setLoadingUser(false);
    })();
  }, [router]);

  // 2) Cargar clientes + casos
  useEffect(() => {
    if (loadingUser) return;

    (async () => {
      setLoadingData(true);
      setErrorMsg(null);

      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user) {
        router.push('/portal/login');
        return;
      }

      const { data, error } = await supabase
        .from('clientes')
        .select(
          `
          id,
          nombre,
          email,
          telefono,
          created_at,
          casos (
            id,
            titulo,
            estado,
            progreso,
            notas,
            created_at,
            updated_at
          )
        `,
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
  console.error('❌ Error cargando clientes desde la API:', error);

  const detalle =
    error?.message ||
    error?.error_description ||
    JSON.stringify(error) ||
    'No se han podido cargar los clientes.';

  setErrorMsg(detalle);
  setClientes([]);
} else {
  // Garantizamos que casos sea array
        const normalizados = (data || []).map((c: any) => ({
          ...c,
          casos: Array.isArray(c.casos) ? c.casos : [],
        }));
        setClientes(normalizados);
      }

      setLoadingData(false);
    })();
  }, [loadingUser, router]);

  // 3) Filtro + búsqueda en memoria
  const clientesFiltrados = useMemo(() => {
    let lista = [...clientes];

    // filtro por estado
    if (estadoFiltro !== 'todos') {
      lista = lista.filter((c) => {
        const casoPrincipal = c.casos?.[0];
        if (!casoPrincipal) return false;
        return (casoPrincipal.estado || '') === estadoFiltro;
      });
    }

    // búsqueda
    if (search.trim()) {
      const q = search.toLowerCase();
      lista = lista.filter((c) => {
        return (
          c.nombre?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          (c.telefono || '').toLowerCase().includes(q)
        );
      });
    }

    return lista;
  }, [clientes, search, estadoFiltro]);

  // 4) Render
  if (loadingUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <div className="text-sm text-slate-400">Cargando portal…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* Barra superior */}
      <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-widest text-emerald-400/80">
              BKC Hipotecas · Panel interno
            </div>
            <h1 className="text-lg font-semibold text-slate-50">
              Clientes y expedientes
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.refresh()}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800/70"
            >
              Refrescar
            </button>
            <Link
              href="/portal/clients/new"
              className="px-3 py-1.5 text-xs rounded-lg bg-emerald-500 text-slate-950 font-semibold hover:bg-emerald-400"
            >
              + Nuevo cliente
            </Link>
          </div>
        </div>
      </header>

      {/* Contenido */}
      <main className="max-w-6xl mx-auto px-4 py-5 space-y-4">
        {/* Filtros / búsqueda */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 mr-1" />
            {clientesFiltrados.length} clientes encontrados
          </div>
          <div className="flex flex-col md:flex-row gap-2 md:items-center">
            {/* Filtro de estado */}
            <div className="flex flex-wrap gap-1 text-[11px]">
              {(
                [
                  ['todos', 'Todos'],
                  ['en_estudio', 'En estudio'],
                  ['documentacion_pendiente', 'Doc. pendiente'],
                  ['en_banco', 'En banco'],
                  ['preaprobado', 'Preaprobado'],
                  ['fein', 'FEIN'],
                  ['tasacion', 'Tasación'],
                  ['aprobado_final', 'Aprobado final'],
                  ['firma', 'Firma'],
                  ['cerrado', 'Cerrado'],
                ] as [EstadoFiltro, string][]
              ).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setEstadoFiltro(value)}
                  className={`px-2.5 py-1 rounded-full border text-xs ${
                    estadoFiltro === value
                      ? 'bg-emerald-500 text-slate-950 border-emerald-500'
                      : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {/* Buscador */}
            <div className="md:ml-2">
              <input
                type="text"
                placeholder="Buscar por nombre, email o teléfono…"
                className="w-full md:w-72 rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Mensaje de error si lo hay */}
        {errorMsg && (
          <div className="text-xs text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">
            {errorMsg}
          </div>
        )}

        {/* Tabla */}
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-900/80 border-b border-slate-800">
              <tr className="text-slate-400">
                <th className="px-3 py-2 text-left font-medium">Cliente</th>
                <th className="px-3 py-2 text-left font-medium">Contacto</th>
                <th className="px-3 py-2 text-left font-medium">
                  Fechas
                </th>
                <th className="px-3 py-2 text-left font-medium">
                  Expediente
                </th>
                <th className="px-3 py-2 text-left font-medium">
                  Progreso
                </th>
                <th className="px-3 py-2 text-left font-medium">
                  Observaciones
                </th>
                <th className="px-3 py-2 text-right font-medium">
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody>
              {loadingData ? (
                // Skeleton mientras carga
                [...Array(4)].map((_, i) => (
                  <tr key={i} className="border-b border-slate-800/60">
                    <td className="px-3 py-3">
                      <div className="h-3 w-32 rounded bg-slate-800 animate-pulse" />
                    </td>
                    <td className="px-3 py-3">
                      <div className="h-3 w-40 rounded bg-slate-800 animate-pulse" />
                    </td>
                    <td className="px-3 py-3">
                      <div className="h-3 w-24 rounded bg-slate-800 animate-pulse" />
                    </td>
                    <td className="px-3 py-3">
                      <div className="h-3 w-20 rounded bg-slate-800 animate-pulse" />
                    </td>
                    <td className="px-3 py-3">
                      <div className="h-2 w-24 rounded bg-slate-800 animate-pulse" />
                    </td>
                    <td className="px-3 py-3">
                      <div className="h-3 w-32 rounded bg-slate-800 animate-pulse" />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="h-7 w-20 rounded bg-slate-800 animate-pulse inline-block" />
                    </td>
                  </tr>
                ))
              ) : clientesFiltrados.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-6 text-center text-slate-500"
                  >
                    No hay clientes con los filtros actuales.
                  </td>
                </tr>
              ) : (
                clientesFiltrados.map((cli) => {
                  const casoPrincipal: Caso | undefined = cli.casos[0];

                  const estado = casoPrincipal?.estado || 'en_estudio';
                  const estadoLabel =
                    ESTADO_LABELS[estado] || 'En estudio';
                  const estadoColor =
                    ESTADO_COLORS[estado] ||
                    'bg-slate-800 text-slate-100 border-slate-700';

                  const progreso = casoPrincipal?.progreso ?? 0;

                  const notasCortas = casoPrincipal?.notas
                    ? casoPrincipal.notas.length > 80
                      ? casoPrincipal.notas.slice(0, 80) + '…'
                      : casoPrincipal.notas
                    : '—';

                  return (
                    <tr
                      key={cli.id}
                      className="border-b border-slate-800/60 hover:bg-slate-900/60"
                    >
                      {/* Cliente */}
                      <td className="px-3 py-3 align-top">
                        <div className="font-semibold text-slate-50">
                          {cli.nombre}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          ID: {cli.id.slice(0, 8)}…
                        </div>
                      </td>

                      {/* Contacto */}
                      <td className="px-3 py-3 align-top">
                        <div className="text-[11px] text-slate-300">
                          {cli.email}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {cli.telefono || 'Sin teléfono'}
                        </div>
                      </td>

                      {/* Fechas */}
                      <td className="px-3 py-3 align-top text-[11px] text-slate-400">
                        <div>Alta: {formatDate(cli.created_at)}</div>
                        <div>
                          Últ. act:{' '}
                          {formatDate(
                            casoPrincipal?.updated_at ||
                              casoPrincipal?.created_at,
                          )}
                        </div>
                      </td>

                      {/* Expediente */}
                      <td className="px-3 py-3 align-top text-[11px]">
                        {casoPrincipal ? (
                          <>
                            <div
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${estadoColor} text-[10px] mb-1`}
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                              {estadoLabel}
                            </div>
                            <div className="text-slate-300">
                              {casoPrincipal.titulo || 'Expediente hipotecario'}
                            </div>
                            <div className="text-slate-500">
                              Caso ID: {casoPrincipal.id.slice(0, 8)}…
                            </div>
                          </>
                        ) : (
                          <span className="text-slate-500">
                            Sin expediente asociado
                          </span>
                        )}
                      </td>

                      {/* Progreso */}
                      <td className="px-3 py-3 align-top">
                        <div className="flex items-center gap-2 text-[11px]">
                          <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-1.5 rounded-full bg-emerald-500"
                              style={{ width: `${Math.min(Math.max(progreso, 0), 100)}%` }}
                            />
                          </div>
                          <span className="text-slate-300">
                            {Math.min(Math.max(progreso, 0), 100)}%
                          </span>
                        </div>
                      </td>

                      {/* Observaciones */}
                      <td className="px-3 py-3 align-top text-[11px] text-slate-300">
                        {notasCortas}
                      </td>

                      {/* Acciones */}
                      <td className="px-3 py-3 align-top text-right">
                        {casoPrincipal ? (
                          <Link
                            href={`/portal/case/${casoPrincipal.id}`}
                            className="inline-flex items-center justify-center rounded-lg border border-emerald-500/70 text-emerald-400 text-[11px] font-medium px-3 py-1.5 hover:bg-emerald-500 hover:text-slate-950 transition"
                          >
                            Ver expediente
                          </Link>
                        ) : (
                          <span className="text-[11px] text-slate-500">
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
