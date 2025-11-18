'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type Cliente = {
  id: string;
  nombre: string | null;
  email: string | null;
  telefono: string | null;
};

type Caso = {
  id: string;
  titulo: string | null;
  estado: string | null;
  progreso: number | null;
  notas: string | null;
  created_at: string;
  seguimiento_token: string | null;
  cliente: Cliente;
};

type EstadoFiltro = 'todos' | 'en_estudio' | 'cerrado';

function formatearFecha(fecha: string) {
  try {
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return fecha;
  }
}

function formatearEstado(estado: string | null) {
  if (!estado) return 'EN_ESTUDIO';
  return estado.toUpperCase();
}

export default function PortalPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [casos, setCasos] = useState<Caso[]>([]);
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>('todos');
  const [search, setSearch] = useState('');

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
          setError('Debes iniciar sesión para ver tus clientes y expedientes.');
          setLoading(false);
          return;
        }

        // 2️⃣ Traer los casos con el cliente asociado
        const { data, error: casosError } = await supabase
          .from('casos')
          .select(
            `
            id,
            titulo,
            estado,
            progreso,
            notas,
            created_at,
            seguimiento_token,
            cliente:cliente_id (
              id,
              nombre,
              email,
              telefono
            )
          `
          )
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (casosError) {
          console.error('Error cargando casos:', casosError);
          setError('No se han podido cargar los expedientes.');
          setLoading(false);
          return;
        }

        const normalizados: Caso[] =
          (data as any[])?.map((row) => ({
            id: row.id,
            titulo: row.titulo,
            estado: row.estado,
            progreso: row.progreso,
            notas: row.notas,
            created_at: row.created_at,
            seguimiento_token: row.seguimiento_token,
            cliente: {
              id: row.cliente?.id,
              nombre: row.cliente?.nombre ?? '—',
              email: row.cliente?.email ?? '—',
              telefono: row.cliente?.telefono ?? null,
            },
          })) ?? [];

        setCasos(normalizados);
      } catch (err: any) {
        console.error('Error inesperado cargando portal:', err);
        const msg =
          typeof err === 'string'
            ? err
            : err?.message
            ? err.message
            : JSON.stringify(err);
        setError(`Ha ocurrido un error al cargar los datos: ${msg}`);
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, []);

  const casosFiltrados = useMemo(() => {
    let resultado = [...casos];

    if (estadoFiltro !== 'todos') {
      resultado = resultado.filter((c) =>
        (c.estado ?? 'EN_ESTUDIO').toLowerCase().includes(estadoFiltro)
      );
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      resultado = resultado.filter((c) => {
        const nombre = c.cliente.nombre?.toLowerCase() ?? '';
        const email = c.cliente.email?.toLowerCase() ?? '';
        const telefono = c.cliente.telefono?.toLowerCase() ?? '';
        const titulo = c.titulo?.toLowerCase() ?? '';
        return (
          nombre.includes(q) ||
          email.includes(q) ||
          telefono.includes(q) ||
          titulo.includes(q)
        );
      });
    }

    return resultado;
  }, [casos, estadoFiltro, search]);

  const irANuevoCliente = () => {
    router.push('/portal/clients/new');
  };

  const irACaso = (id: string) => {
    router.push(`/portal/case/${id}`);
  };

  const verComoCliente = (seguimientoToken: string | null) => {
    if (!seguimientoToken) return;
    // Siempre a la ruta pública de seguimiento
    window.open(`/seguimiento/${seguimientoToken}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* Cabecera */}
      <header className="border-b border-slate-900/70 bg-slate-950/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-emerald-400">
              BKC Hipotecas · Panel interno
            </p>
            <h1 className="text-xl md:text-2xl font-semibold mt-1">
              Clientes y expedientes <span className="text-xs text-slate-500">(PRUEBA)</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Desde aquí ves todos tus clientes, accedes al expediente y puedes ver lo mismo que ve
              el cliente.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => location.reload()}
              className="rounded-md border border-slate-700 px-3 py-1.5 text-xs md:text-sm hover:bg-slate-800 transition"
            >
              Refrescar
            </button>
            <button
              type="button"
              onClick={irANuevoCliente}
              className="rounded-md bg-emerald-500 text-slate-950 px-3 py-1.5 text-xs md:text-sm font-semibold hover:bg-emerald-400 transition"
            >
              + Nuevo cliente
            </button>
          </div>
        </div>
      </header>

      {/* Contenido */}
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        {/* Filtros y buscador */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="inline-flex rounded-full bg-slate-900/80 border border-slate-800 p-1">
            <button
              type="button"
              onClick={() => setEstadoFiltro('todos')}
              className={`px-3 py-1.5 text-xs rounded-full ${
                estadoFiltro === 'todos'
                  ? 'bg-emerald-500 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setEstadoFiltro('en_estudio')}
              className={`px-3 py-1.5 text-xs rounded-full ${
                estadoFiltro === 'en_estudio'
                  ? 'bg-emerald-500 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              En estudio
            </button>
            <button
              type="button"
              onClick={() => setEstadoFiltro('cerrado')}
              className={`px-3 py-1.5 text-xs rounded-full ${
                estadoFiltro === 'cerrado'
                  ? 'bg-emerald-500 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              Cerrado
            </button>
          </div>

          <div className="w-full md:w-72">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, email, teléfono o expediente…"
              className="w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-xs md:text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Mensajes de estado */}
        {loading && (
          <div className="mt-6 text-sm text-slate-400">
            Cargando clientes y expedientes…
          </div>
        )}

        {error && !loading && (
          <div className="mt-4 rounded-md border border-red-700 bg-red-950/50 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        )}

        {!loading && !error && casosFiltrados.length === 0 && (
          <div className="mt-6 text-sm text-slate-400">
            No hay clientes con los filtros actuales.
          </div>
        )}

        {/* Tabla de clientes / expedientes */}
        {!loading && !error && casosFiltrados.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-slate-900 bg-slate-950/60">
            <table className="min-w-full text-xs md:text-sm">
              <thead className="bg-slate-900/80 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-400">Cliente</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-400">Contacto</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-400">Fechas</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-400">Expediente</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-400">Progreso</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-400">Observaciones</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-400">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {casosFiltrados.map((caso) => (
                  <tr key={caso.id} className="border-t border-slate-900/70 hover:bg-slate-900/40">
                    <td className="px-4 py-3 align-top">
                      <div className="font-semibold text-slate-100">
                        {caso.cliente.nombre || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-slate-300">
                      <div>{caso.cliente.email}</div>
                      {caso.cliente.telefono && (
                        <div className="text-xs text-slate-500">{caso.cliente.telefono}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-slate-300">
                      <div className="text-xs">
                        Alta: {formatearFecha(caso.created_at)}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium text-slate-100">
                        {caso.titulo || 'Expediente hipotecario'}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Estado: {formatearEstado(caso.estado)}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-slate-300">
                      <div className="text-xs">
                        {caso.progreso ?? 0}
                        %
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-slate-300">
                      <div className="text-xs line-clamp-2">
                        {caso.notas || 'Expediente creado automáticamente.'}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => irACaso(caso.id)}
                          className="text-[11px] text-emerald-400 hover:text-emerald-300 text-left"
                        >
                          Ver expediente →
                        </button>
                        {caso.seguimiento_token ? (
                          <button
                            type="button"
                            onClick={() => verComoCliente(caso.seguimiento_token)}
                            className="text-[11px] text-emerald-400 hover:text-emerald-300 text-left"
                          >
                            Ver como cliente →
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-500">
                            Sin enlace de seguimiento
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
