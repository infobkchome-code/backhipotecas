'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

// -----------------------------
// Tipos
// -----------------------------
type Caso = {
  id: string;
  titulo: string;
  estado: string;
  progreso: number;
  urgente: boolean;
  fecha_limite: string | null;
  updated_at: string;
  // 👇 NUEVO: datos de checklist
  docs_total?: number;
  docs_completados?: number;
};

// Estados para contadores
const ESTADOS = [
  { value: 'en_estudio', label: 'En estudio' },
  { value: 'tasacion', label: 'Tasación' },
  { value: 'fein', label: 'FEIN' },
  { value: 'notaria', label: 'Notaría' },
  { value: 'compraventa', label: 'Compraventa' },
  { value: 'fin', label: 'Finalizado' },
  { value: 'denegado', label: 'Denegado' },
];

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [casos, setCasos] = useState<Caso[]>([]);
  const [filtered, setFiltered] = useState<Caso[]>([]);
  const [search, setSearch] = useState('');

  // Filtros simples
  const [filterEstado, setFilterEstado] = useState<string | null>(null);
  const [filterUrgente, setFilterUrgente] = useState<boolean | null>(null);
  const [filterVencido, setFilterVencido] = useState<boolean | null>(null);
  const [filterDocsPendientes, setFilterDocsPendientes] =
    useState<boolean>(false); // 👈 NUEVO

  // -----------------------------
  // Cargar expedientes + checklist
  // -----------------------------
  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      // 1) Cargar casos
      const { data, error } = await supabase
        .from('casos')
        .select(
          `
          id,
          titulo,
          estado,
          progreso,
          urgente,
          fecha_limite,
          updated_at
        `
        )
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error || !data) {
        console.error('Error cargando casos:', error);
        setLoading(false);
        return;
      }

      const casosBase = data as Caso[];

      // 2) Cargar checklist de todos los casos (en bloque)
      const caseIds = casosBase.map((c) => c.id);
      let casosConDocs: Caso[] = casosBase;

      if (caseIds.length > 0) {
        const { data: docsRows, error: docsError } = await supabase
          .from('casos_documentos_requeridos')
          .select('caso_id, completado')
          .in('caso_id', caseIds);

        if (docsError) {
          console.error('Error cargando checklist global:', docsError);
        } else if (docsRows) {
          // Agrupar por caso
          const stats: Record<
            string,
            { total: number; completados: number }
          > = {};

          (docsRows as { caso_id: string; completado: boolean }[]).forEach(
            (row) => {
              if (!stats[row.caso_id]) {
                stats[row.caso_id] = { total: 0, completados: 0 };
              }
              stats[row.caso_id].total += 1;
              if (row.completado) {
                stats[row.caso_id].completados += 1;
              }
            }
          );

          casosConDocs = casosBase.map((c) => {
            const info = stats[c.id];
            return {
              ...c,
              docs_total: info?.total ?? 0,
              docs_completados: info?.completados ?? 0,
            };
          });
        }
      }

      setCasos(casosConDocs);
      setFiltered(casosConDocs);
      setLoading(false);
    };

    load();
  }, []);

  // -----------------------------
  // Aplicar buscador + filtros
  // -----------------------------
  useEffect(() => {
    let results = [...casos];

    // Buscador
    if (search.trim() !== '') {
      const term = search.toLowerCase();
      results = results.filter((c) =>
        (c.titulo || '').toLowerCase().includes(term)
      );
    }

    // Filtro estado
    if (filterEstado) {
      results = results.filter((c) => c.estado === filterEstado);
    }

    // Filtro urgente
    if (filterUrgente !== null) {
      results = results.filter((c) => c.urgente === filterUrgente);
    }

    // Filtro vencidos
    if (filterVencido) {
      const now = new Date().getTime();
      results = results.filter((c) => {
        if (!c.fecha_limite) return false;
        return new Date(c.fecha_limite).getTime() < now;
      });
    }

    // 👇 NUEVO: filtro “docs pendientes”
    if (filterDocsPendientes) {
      results = results.filter((c) => {
        const total = c.docs_total ?? 0;
        const comp = c.docs_completados ?? 0;
        return total > 0 && comp < total;
      });
    }

    setFiltered(results);
  }, [search, filterEstado, filterUrgente, filterVencido, filterDocsPendientes, casos]);

  // Contadores
  const countByEstado = (estado: string) =>
    casos.filter((c) => c.estado === estado).length;

  const urgentes = casos.filter((c) => c.urgente).length;

  const vencidos = casos.filter(
    (c) =>
      c.fecha_limite &&
      new Date(c.fecha_limite).getTime() < new Date().getTime()
  ).length;

  const docsPendientesCount = casos.filter((c) => {
    const total = c.docs_total ?? 0;
    const comp = c.docs_completados ?? 0;
    return total > 0 && comp < total;
  }).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* -------------------------------- HEADER -------------------------------- */}
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        {/* Logo + título */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-700 text-white font-bold px-3 py-1.5 rounded-md text-lg tracking-wide">
            BKC
          </div>

          <div>
            <h1 className="text-xl font-semibold">BKC Hipotecas</h1>
            <p className="text-xs text-slate-400 -mt-0.5">
              Panel de expedientes
            </p>
          </div>
        </div>

        {/* Acciones rápidas */}
        <div className="flex items-center gap-3">
          <Link
            href="/portal/clients/new"
            className="bg-emerald-500 text-slate-950 px-4 py-2 rounded-md text-sm font-medium hover:bg-emerald-400"
          >
            + Nuevo expediente
          </Link>

          <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-sm">
            N
          </div>
        </div>
      </header>

      {/* -------------------------------- ESTADÍSTICAS -------------------------------- */}
      <section className="px-6 py-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-3">
        {ESTADOS.map((item) => (
          <div
            key={item.value}
            className="rounded-lg bg-slate-900/60 border border-slate-800 p-3 text-center"
          >
            <p className="text-xs text-slate-400">{item.label}</p>
            <p className="text-lg font-semibold text-slate-100">
              {countByEstado(item.value)}
            </p>
          </div>
        ))}

        {/* Urgentes */}
        <div className="rounded-lg bg-red-950/40 border border-red-800 p-3 text-center">
          <p className="text-xs text-red-300">Urgentes</p>
          <p className="text-lg font-semibold text-red-400">{urgentes}</p>
        </div>

        {/* Vencidos */}
        <div className="rounded-lg bg-orange-950/40 border border-orange-800 p-3 text-center">
          <p className="text-xs text-orange-300">Vencidos</p>
          <p className="text-lg font-semibold text-orange-400">
            {vencidos}
          </p>
        </div>

        {/* 👇 NUEVO: Docs pendientes */}
        <div className="rounded-lg bg-amber-950/40 border border-amber-700 p-3 text-center">
          <p className="text-xs text-amber-300">Docs pendientes</p>
          <p className="text-lg font-semibold text-amber-300">
            {docsPendientesCount}
          </p>
        </div>
      </section>

      {/* -------------------------------- BUSCADOR + FILTROS -------------------------------- */}
      <section className="px-6 pb-6">
        {/* Buscador */}
        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, cliente, dirección…"
            className="flex-1 rounded-md bg-slate-900 border border-slate-700 px-4 py-2 text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro por estado */}
          <select
            value={filterEstado ?? ''}
            onChange={(e) =>
              setFilterEstado(e.target.value === '' ? null : e.target.value)
            }
            className="rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">Todos los estados</option>
            {ESTADOS.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </select>

          {/* Filtro urgente */}
          <button
            onClick={() =>
              setFilterUrgente(filterUrgente === true ? null : true)
            }
            className={`px-3 py-2 rounded-md text-xs border ${
              filterUrgente
                ? 'bg-red-600 border-red-700 text-white'
                : 'bg-slate-900 border-slate-700 text-slate-300'
            }`}
          >
            Urgentes
          </button>

          {/* Filtro vencidos */}
          <button
            onClick={() =>
              setFilterVencido(filterVencido === true ? null : true)
            }
            className={`px-3 py-2 rounded-md text-xs border ${
              filterVencido
                ? 'bg-orange-600 border-orange-700 text-white'
                : 'bg-slate-900 border-slate-700 text-slate-300'
            }`}
          >
            Vencidos
          </button>

          {/* 👇 NUEVO: filtro docs pendientes */}
          <button
            onClick={() => setFilterDocsPendientes(!filterDocsPendientes)}
            className={`px-3 py-2 rounded-md text-xs border ${
              filterDocsPendientes
                ? 'bg-amber-500 border-amber-600 text-slate-950'
                : 'bg-slate-900 border-slate-700 text-slate-300'
            }`}
          >
            Docs pendientes
          </button>

          {/* Reset filtros */}
          <button
            onClick={() => {
              setFilterEstado(null);
              setFilterUrgente(null);
              setFilterVencido(null);
              setFilterDocsPendientes(false);
              setSearch('');
            }}
            className="px-3 py-2 rounded-md border border-slate-700 text-xs text-slate-300 bg-slate-900 hover:bg-slate-800"
          >
            Limpiar filtros
          </button>
        </div>
      </section>

      {/* -------------------------------- TABLA PRO -------------------------------- */}
      <section className="px-6 pb-20">
        <div className="border border-slate-800 rounded-lg overflow-hidden">
          {/* Cabecera tabla */}
          <div className="bg-slate-900/80 px-4 py-3 grid grid-cols-7 text-xs text-slate-400 font-medium">
            <div className="col-span-2">Expediente</div>
            <div>Estado</div>
            <div>Urgente</div>
            <div>Fecha límite</div>
            <div>Documentación</div>
            <div>Acciones</div>
          </div>

          {/* Cuerpo */}
          <div className="divide-y divide-slate-800">
            {filtered.length === 0 && (
              <div className="px-4 py-6 text-center text-slate-500 text-sm">
                No hay expedientes que coincidan con los filtros.
              </div>
            )}

            {filtered.map((c) => {
              // Fecha límite → countdown
              let fechaTexto = '-';
              let fechaColor = 'text-slate-300';

              if (c.fecha_limite) {
                const now = new Date().getTime();
                const limit = new Date(c.fecha_limite).getTime();
                const diff = limit - now;
                const days = Math.ceil(
                  diff / (1000 * 60 * 60 * 24)
                );

                if (days < 0) {
                  fechaTexto = `Vencido (${Math.abs(days)} días)`;
                  fechaColor = 'text-red-400';
                } else if (days === 0) {
                  fechaTexto = 'Hoy';
                  fechaColor = 'text-orange-400';
                } else if (days === 1) {
                  fechaTexto = 'Mañana';
                  fechaColor = 'text-yellow-400';
                } else {
                  fechaTexto = `En ${days} días`;
                  fechaColor = 'text-slate-300';
                }
              }

              // Estado → badge
              const estadoBadge = {
                en_estudio:
                  'bg-blue-900 text-blue-300 border-blue-700',
                tasacion:
                  'bg-purple-900 text-purple-300 border-purple-700',
                fein: 'bg-indigo-900 text-indigo-300 border-indigo-700',
                notaria:
                  'bg-yellow-900 text-yellow-300 border-yellow-700',
                compraventa:
                  'bg-green-900 text-green-300 border-green-700',
                fin: 'bg-slate-700 text-slate-300 border-slate-600',
                denegado:
                  'bg-red-900 text-red-300 border-red-700',
              }[c.estado];

              // Docs resumen
              const totalDocs = c.docs_total ?? 0;
              const doneDocs = c.docs_completados ?? 0;
              const docsTexto =
                totalDocs > 0 ? `${doneDocs}/${totalDocs}` : '-';
              const docsColor =
                totalDocs > 0
                  ? doneDocs === totalDocs
                    ? 'text-emerald-400'
                    : 'text-amber-300'
                  : 'text-slate-400';

              return (
                <div
                  key={c.id}
                  className="grid grid-cols-7 items-center px-4 py-4 hover:bg-slate-900/40 text-sm"
                >
                  {/* EXPEDIENTE */}
                  <div className="col-span-2">
                    <p className="text-slate-100 font-medium">
                      {c.titulo}
                    </p>
                    <p className="text-xs text-slate-500">
                      Último movimiento:{' '}
                      {new Date(
                        c.updated_at
                      ).toLocaleDateString('es-ES')}
                    </p>
                  </div>

                  {/* ESTADO */}
                  <div>
                    <span
                      className={`px-2 py-1 text-xs rounded-md border ${estadoBadge}`}
                    >
                      {ESTADOS.find(
                        (e) => e.value === c.estado
                      )?.label || c.estado}
                    </span>
                  </div>

                  {/* URGENTE */}
                  <div>
                    {c.urgente ? (
                      <span className="px-2 py-1 text-xs rounded-md bg-red-700 text-white border border-red-800 animate-pulse">
                        ¡Urgente!
                      </span>
                    ) : (
                      <span className="text-slate-500 text-xs">
                        -
                      </span>
                    )}
                  </div>

                  {/* FECHA LÍMITE */}
                  <div>
                    <span className={`text-xs ${fechaColor}`}>
                      {fechaTexto}
                    </span>
                  </div>

                  {/* DOCUMENTACIÓN */}
                  <div>
                    <span className={`text-xs font-medium ${docsColor}`}>
                      {docsTexto}
                    </span>
                  </div>

                  {/* ACCIONES */}
                  <div className="flex gap-2 justify-end">
                    {/* Abrir expediente */}
                    <Link
                      href={`/portal/case/${c.id}`}
                      className="text-emerald-400 hover:text-emerald-300 text-xs"
                    >
                      Abrir
                    </Link>

                    {/* Marcar urgente / no urgente */}
                    <button
                      onClick={async () => {
                        await supabase
                          .from('casos')
                          .update({ urgente: !c.urgente })
                          .eq('id', c.id);

                        // refrescar la lista en memoria
                        const updated = casos.map((x) =>
                          x.id === c.id
                            ? { ...x, urgente: !c.urgente }
                            : x
                        );
                        setCasos(updated);
                      }}
                      className="text-red-400 hover:text-red-300 text-xs"
                    >
                      {c.urgente ? 'Quitar' : 'Urgente'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
