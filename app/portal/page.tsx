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
  docs_total?: number;
  docs_completados?: number;
  prioridad_manual_alta?: boolean | null;
  cliente_tiene_mensajes_nuevos?: boolean | null;
};

const ESTADOS = [
  { value: 'en_estudio', label: 'En estudio' },
  { value: 'tasacion', label: 'Tasación' },
  { value: 'fein', label: 'FEIN' },
  { value: 'notaria', label: 'Notaría' },
  { value: 'compraventa', label: 'Compraventa' },
  { value: 'fin', label: 'Finalizado' },
  { value: 'denegado', label: 'Denegado' },
];

type SortMode = 'default' | 'docs' | 'prioridad';

// -----------------------------
// Prioridad automática
// -----------------------------
function calcularPrioridad(c: Caso) {
  let score = 0;
  const now = Date.now();
  const msDia = 86400000;

  if (c.urgente) score += 40;

  if (c.fecha_limite) {
    const limit = new Date(c.fecha_limite).getTime();
    const diffDias = Math.ceil((limit - now) / msDia);

    if (diffDias < 0) score += 30;
    else if (diffDias <= 2) score += 25;
    else if (diffDias <= 5) score += 15;
  }

  const totalDocs = c.docs_total ?? 0;
  const doneDocs = c.docs_completados ?? 0;
  if (totalDocs > 0) {
    const ratio = doneDocs / totalDocs;
    if (ratio === 0) score += 20;
    else if (ratio < 0.5) score += 15;
    else if (ratio < 1) score += 5;
  }

  const updated = new Date(c.updated_at).getTime();
  const diasSinMover = (now - updated) / msDia;
  if (diasSinMover > 10) score += 10;
  else if (diasSinMover > 5) score += 5;

  if (
    c.estado === 'tasacion' ||
    c.estado === 'fein' ||
    c.estado === 'notaria' ||
    c.estado === 'compraventa'
  ) {
    score += 10;
  }

  if (c.prioridad_manual_alta) score = Math.max(score, 80);

  let nivel: 'baja' | 'media' | 'alta' | 'critica' = 'baja';
  if (score >= 80) nivel = 'critica';
  else if (score >= 60) nivel = 'alta';
  else if (score >= 30) nivel = 'media';

  return {
    score,
    nivel,
    label:
      nivel === 'critica'
        ? 'Crítica'
        : nivel === 'alta'
        ? 'Alta'
        : nivel === 'media'
        ? 'Media'
        : 'Baja',
  };
}

// ------------------------------------------------------
// COMPONENTE PRINCIPAL
// ------------------------------------------------------
export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [casos, setCasos] = useState<Caso[]>([]);
  const [filtered, setFiltered] = useState<Caso[]>([]);
  const [search, setSearch] = useState('');

  const [filterEstado, setFilterEstado] = useState<string | null>(null);
  const [filterUrgente, setFilterUrgente] = useState<boolean | null>(null);
  const [filterVencido, setFilterVencido] = useState<boolean | null>(null);
  const [filterDocsPendientes, setFilterDocsPendientes] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('default');

  // -----------------------------
  // Cargar expedientes
  // -----------------------------
  useEffect(() => {
    const load = async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;

      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('casos')
        .select(
          'id,titulo,estado,progreso,urgente,fecha_limite,updated_at,prioridad_manual_alta,cliente_tiene_mensajes_nuevos'
        )
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error || !data) {
        console.error('Error cargando casos:', error);
        setLoading(false);
        return;
      }

      const base = data as Caso[];
      const ids = base.map((c) => c.id);

      let casosConDocs = base;

      if (ids.length > 0) {
        const { data: docs } = await supabase
          .from('casos_documentos_requeridos')
          .select('caso_id, completado')
          .in('caso_id', ids);

        if (docs) {
          const stats: Record<string, { total: number; ok: number }> = {};

          docs.forEach((row) => {
            if (!stats[row.caso_id]) stats[row.caso_id] = { total: 0, ok: 0 };
            stats[row.caso_id].total++;
            if (row.completado) stats[row.caso_id].ok++;
          });

          casosConDocs = base.map((c) => ({
            ...c,
            docs_total: stats[c.id]?.total ?? 0,
            docs_completados: stats[c.id]?.ok ?? 0,
          }));
        }
      }

      setCasos(casosConDocs);
      setFiltered(casosConDocs);
      setLoading(false);
    };

    load();
  }, []);

  // -----------------------------
  // Buscador + filtros + orden
  // -----------------------------
  useEffect(() => {
    let r = [...casos];

    if (search.trim()) {
      const t = search.toLowerCase();
      r = r.filter((c) => c.titulo.toLowerCase().includes(t));
    }

    if (filterEstado) r = r.filter((c) => c.estado === filterEstado);

    if (filterUrgente !== null) r = r.filter((c) => c.urgente === filterUrgente);

    if (filterVencido) {
      const now = Date.now();
      r = r.filter(
        (c) => c.fecha_limite && new Date(c.fecha_limite).getTime() < now
      );
    }

    if (filterDocsPendientes) {
      r = r.filter((c) => {
        const t = c.docs_total ?? 0;
        const ok = c.docs_completados ?? 0;
        return t > 0 && ok < t;
      });
    }

    r.sort((a, b) => {
      if (sortMode === 'docs') {
        const ra =
          (a.docs_completados ?? 0) / Math.max(1, a.docs_total ?? 1);
        const rb =
          (b.docs_completados ?? 0) / Math.max(1, b.docs_total ?? 1);
        return ra - rb;
      }

      if (sortMode === 'prioridad') {
        return calcularPrioridad(b).score - calcularPrioridad(a).score;
      }

      return (
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    });

    setFiltered(r);
  }, [
    casos,
    search,
    filterEstado,
    filterUrgente,
    filterVencido,
    filterDocsPendientes,
    sortMode,
  ]);

  // -----------------------------
  // Helpers
  // -----------------------------
  const getFechaInfo = (c: Caso) => {
    if (!c.fecha_limite)
      return { text: '-', color: 'text-slate-500' };

    const now = Date.now();
    const limit = new Date(c.fecha_limite).getTime();
    const diff = limit - now;
    const days = Math.ceil(diff / 86400000);

    if (days < 0)
      return {
        text: `Vencido (${Math.abs(days)} días)`,
        color: 'text-red-600',
      };

    if (days === 0) return { text: 'Hoy', color: 'text-orange-600' };
    if (days === 1) return { text: 'Mañana', color: 'text-amber-600' };

    return { text: `En ${days} días`, color: 'text-slate-600' };
  };
  // -----------------------------
  // RENDER
  // -----------------------------
  return (
    <div className="space-y-6">
      {/* TOP */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-slate-900">
            Expedientes
          </h1>
          <p className="text-sm text-slate-500">
            Visualiza y prioriza todos tus casos hipotecarios.
          </p>

          {casosConMensajesNuevos > 0 && (
            <p className="text-xs mt-1 text-emerald-700 font-medium">
              {casosConMensajesNuevos}{' '}
              expediente{casosConMensajesNuevos !== 1 && 's'} con nuevos
              mensajes del cliente.
            </p>
          )}
        </div>

        <Link
          href="/portal/clients/new"
          className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-500"
        >
          + Nuevo expediente
        </Link>
      </div>

      {/* LISTA MÓVIL */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-3 md:hidden">
          {filtered.map((c) => {
            const { text: fechaTexto, color: fechaColor } = getFechaInfo(c);
            const totalDocs = c.docs_total ?? 0;
            const doneDocs = c.docs_completados ?? 0;
            const ratio =
              totalDocs > 0 ? Math.min(1, doneDocs / totalDocs) : 0;

            const docsTexto =
              totalDocs > 0 ? `${doneDocs}/${totalDocs}` : '-';

            let docsColor = 'text-slate-500';
            if (totalDocs > 0) {
              if (doneDocs === totalDocs) docsColor = 'text-emerald-600';
              else if (doneDocs === 0) docsColor = 'text-red-600';
              else docsColor = 'text-amber-600';
            }

            const prioridad = calcularPrioridad(c);
            let prioClasses =
              'bg-slate-100 text-slate-700 border-slate-200';
            if (prioridad.nivel === 'critica') {
              prioClasses = 'bg-red-50 text-red-700 border-red-200';
            } else if (prioridad.nivel === 'alta') {
              prioClasses = 'bg-orange-50 text-orange-700 border-orange-200';
            } else if (prioridad.nivel === 'media') {
              prioClasses = 'bg-yellow-50 text-yellow-700 border-yellow-200';
            }

            return (
              <div
                key={c.id}
                className="rounded-xl bg-white border border-slate-200 p-3 shadow-sm space-y-3"
              >
                {/* HEADER */}
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {c.titulo}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Último mov.:{' '}
                      {new Date(c.updated_at).toLocaleDateString('es-ES')}
                    </p>
                  </div>

                  {c.cliente_tiene_mensajes_nuevos && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Nuevo
                    </span>
                  )}
                </div>

                {/* BADGES */}
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${getEstadoClasses(
                      c.estado
                    )}`}
                  >
                    {
                      ESTADOS.find((e) => e.value === c.estado)?.label ??
                      c.estado
                    }
                  </span>

                  {c.urgente && (
                    <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 border border-red-200">
                      ¡Urgente!
                    </span>
                  )}

                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${prioClasses}`}
                  >
                    {prioridad.label}{' '}
                    <span className="pl-1 text-[10px] opacity-70">
                      ({prioridad.score})
                    </span>
                  </span>
                </div>

                {/* PROGRESS + FECHA */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className={`text-[11px] font-medium ${docsColor}`}>
                      Docs: {docsTexto}
                    </p>

                    <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-1.5 ${
                          totalDocs === 0
                            ? 'bg-slate-300'
                            : doneDocs === totalDocs
                            ? 'bg-emerald-500'
                            : 'bg-amber-400'
                        }`}
                        style={{ width: `${ratio * 100}%` }}
                      />
                    </div>
                  </div>

                  <p className={`text-[11px] font-medium ${fechaColor}`}>
                    {fechaTexto}
                  </p>
                </div>

                {/* BOTONES */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Link
                    href={`/portal/case/${c.id}`}
                    className="inline-flex items-center justify-center rounded-lg border border-emerald-500 px-3 py-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50"
                  >
                    Abrir expediente
                  </Link>

                  <button
                    onClick={async () => {
                      await supabase
                        .from('casos')
                        .update({ urgente: !c.urgente })
                        .eq('id', c.id);

                      setCasos((prev) =>
                        prev.map((x) =>
                          x.id === c.id ? { ...x, urgente: !c.urgente } : x
                        )
                      );
                    }}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-3 py-1.5 text-[11px] text-slate-700 bg-white"
                  >
                    {c.urgente ? 'Quitar urgente' : 'Marcar urgente'}
                  </button>

                  <button
                    onClick={async () => {
                      const nuevo = !c.prioridad_manual_alta;

                      await supabase
                        .from('casos')
                        .update({ prioridad_manual_alta: nuevo })
                        .eq('id', c.id);

                      setCasos((prev) =>
                        prev.map((x) =>
                          x.id === c.id
                            ? { ...x, prioridad_manual_alta: nuevo }
                            : x
                        )
                      );
                    }}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-3 py-1.5 text-[11px] text-slate-700 bg-white"
                  >
                    {c.prioridad_manual_alta
                      ? 'Quitar prio alta'
                      : 'Prio alta'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
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
  // checklist
  docs_total?: number;
  docs_completados?: number;
  // prioridad manual
  prioridad_manual_alta?: boolean | null;
  // 🔔 indicador de mensajes nuevos del cliente
  cliente_tiene_mensajes_nuevos?: boolean | null;
};

const ESTADOS = [
  { value: 'en_estudio', label: 'En estudio' },
  { value: 'tasacion', label: 'Tasación' },
  { value: 'fein', label: 'FEIN' },
  { value: 'notaria', label: 'Notaría' },
  { value: 'compraventa', label: 'Compraventa' },
  { value: 'fin', label: 'Finalizado' },
  { value: 'denegado', label: 'Denegado' },
];

type SortMode = 'default' | 'docs' | 'prioridad';

type PrioridadNivel = 'baja' | 'media' | 'alta' | 'critica';

type PrioridadInfo = {
  score: number;
  nivel: PrioridadNivel;
  label: string;
};

// -----------------------------
// Cálculo de prioridad automática + manual
// -----------------------------
function calcularPrioridad(c: Caso): PrioridadInfo {
  let score = 0;
  const now = Date.now();
  const msDia = 1000 * 60 * 60 * 24;

  // 1) Urgente
  if (c.urgente) score += 40;

  // 2) Fecha límite
  if (c.fecha_limite) {
    const limit = new Date(c.fecha_limite).getTime();
    const diffDias = Math.ceil((limit - now) / msDia);

    if (diffDias < 0) {
      // vencido
      score += 30;
    } else if (diffDias <= 2) {
      score += 25;
    } else if (diffDias <= 5) {
      score += 15;
    }
  }

  // 3) Documentación
  const totalDocs = c.docs_total ?? 0;
  const doneDocs = c.docs_completados ?? 0;
  if (totalDocs > 0) {
    const ratio = doneDocs / totalDocs;
    if (ratio === 0) score += 20;
    else if (ratio < 0.5) score += 15;
    else if (ratio < 1) score += 5;
  }

  // 4) Días sin movimiento
  if (c.updated_at) {
    const updated = new Date(c.updated_at).getTime();
    const diasSinMover = (now - updated) / msDia;
    if (diasSinMover > 10) score += 10;
    else if (diasSinMover > 5) score += 5;
  }

  // 5) Estado “crítico”
  if (
    c.estado === 'tasacion' ||
    c.estado === 'fein' ||
    c.estado === 'notaria' ||
    c.estado === 'compraventa'
  ) {
    score += 10;
  }

  // 6) Prioridad manual alta (override)
  if (c.prioridad_manual_alta) {
    const manualScore = 80;
    if (manualScore > score) score = manualScore;
  }

  // Nivel
  let nivel: PrioridadNivel = 'baja';
  if (score >= 80) nivel = 'critica';
  else if (score >= 60) nivel = 'alta';
  else if (score >= 30) nivel = 'media';

  const label =
    nivel === 'critica'
      ? 'Crítica'
      : nivel === 'alta'
      ? 'Alta'
      : nivel === 'media'
      ? 'Media'
      : 'Baja';

  return { score, nivel, label };
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [casos, setCasos] = useState<Caso[]>([]);
  const [filtered, setFiltered] = useState<Caso[]>([]);
  const [search, setSearch] = useState('');

  // Filtros
  const [filterEstado, setFilterEstado] = useState<string | null>(null);
  const [filterUrgente, setFilterUrgente] = useState<boolean | null>(null);
  const [filterVencido, setFilterVencido] = useState<boolean | null>(null);
  const [filterDocsPendientes, setFilterDocsPendientes] =
    useState<boolean>(false);

  const [sortMode, setSortMode] = useState<SortMode>('default');

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
          updated_at,
          prioridad_manual_alta,
          cliente_tiene_mensajes_nuevos
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

      // 2) Cargar checklist en bloque
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
          const stats: Record<string, { total: number; completados: number }> =
            {};

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
  // Realtime: actualizar lista cuando cambien casos
  // -----------------------------
  useEffect(() => {
    const channel = supabase
      .channel('casos-dashboard')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'casos',
        },
        (payload: any) => {
          const nuevo = payload.new as any;
          const antiguo = payload.old as any;

          setCasos((prev) => {
            // DELETE → quitarlo
            if (payload.eventType === 'DELETE') {
              return prev.filter((c) => c.id !== antiguo.id);
            }

            // INSERT → añadir si no está
            if (payload.eventType === 'INSERT') {
              const existe = prev.some((c) => c.id === nuevo.id);
              if (existe) return prev;
              return [
                {
                  ...(nuevo as Caso),
                },
                ...prev,
              ];
            }

            // UPDATE → mezclar datos nuevos
            if (payload.eventType === 'UPDATE') {
              return prev.map((c) =>
                c.id === nuevo.id
                  ? ({
                      ...c,
                      ...nuevo,
                    } as Caso)
                  : c
              );
            }

            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // -----------------------------
  // Aplicar buscador + filtros + orden
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

    // Filtro “docs pendientes”
    if (filterDocsPendientes) {
      results = results.filter((c) => {
        const total = c.docs_total ?? 0;
        const comp = c.docs_completados ?? 0;
        return total > 0 && comp < total;
      });
    }

    // Orden
    results.sort((a, b) => {
      if (sortMode === 'docs') {
        const ta = a.docs_total ?? 0;
        const ca = a.docs_completados ?? 0;
        const tb = b.docs_total ?? 0;
        const cb = b.docs_completados ?? 0;
        const pa = ta > 0 ? ca / ta : 0;
        const pb = tb > 0 ? cb / tb : 0;
        // Menos documentación primero
        if (pa !== pb) return pa - pb;
        return (
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
      }

      if (sortMode === 'prioridad') {
        const pa = calcularPrioridad(a).score;
        const pb = calcularPrioridad(b).score;
        if (pa !== pb) return pb - pa;
        return (
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
      }

      // default: últimos actualizados primero
      return (
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    });

    setFiltered(results);
  }, [
    search,
    filterEstado,
    filterUrgente,
    filterVencido,
    filterDocsPendientes,
    sortMode,
    casos,
  ]);

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

  const casosConMensajesNuevos = casos.filter(
    (c) => c.cliente_tiene_mensajes_nuevos
  ).length;

  // -----------------------------
  // Helpers visuales
  // -----------------------------
  const getFechaInfo = (c: Caso) => {
    if (!c.fecha_limite) return { text: '-', color: 'text-slate-500' };

    const now = new Date().getTime();
    const limit = new Date(c.fecha_limite).getTime();
    const diff = limit - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days < 0) {
      return {
        text: `Vencido (${Math.abs(days)} días)`,
        color: 'text-red-600',
      };
    }
    if (days === 0) {
      return { text: 'Hoy', color: 'text-orange-600' };
    }
    if (days === 1) {
      return { text: 'Mañana', color: 'text-amber-600' };
    }
    return { text: `En ${days} días`, color: 'text-slate-600' };
  };

  const getEstadoClasses = (estado: string) => {
    return {
      en_estudio: 'bg-sky-50 text-sky-700 border-sky-200',
      tasacion: 'bg-purple-50 text-purple-700 border-purple-200',
      fein: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      notaria: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      compraventa: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      fin: 'bg-slate-100 text-slate-700 border-slate-200',
      denegado: 'bg-red-50 text-red-700 border-red-200',
    }[estado] as string;
  };

  // -----------------------------
  // RENDER
  // -----------------------------
  return (
    <div className="space-y-6">
      {/* TOP: título + CTA */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-slate-900">
            Expedientes
          </h1>
          <p className="text-sm text-slate-500">
            Visualiza y prioriza todos tus casos hipotecarios en curso.
          </p>
          {casosConMensajesNuevos > 0 && (
            <p className="text-xs mt-1 text-emerald-700 font-medium">
              {casosConMensajesNuevos} expediente
              {casosConMensajesNuevos !== 1 && 's'} con nuevos mensajes del
              cliente.
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/portal/clients/new"
            className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-500"
          >
            + Nuevo expediente
          </Link>
        </div>
      </div>

      {/* ESTADÍSTICAS RÁPIDAS */}
      <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {ESTADOS.map((item) => (
          <div
            key={item.value}
            className="rounded-xl bg-white border border-slate-200 px-3 py-3 shadow-sm"
          >
            <p className="text-[11px] text-slate-500">{item.label}</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {countByEstado(item.value)}
            </p>
          </div>
        ))}

        <div className="rounded-xl bg-white border border-red-100 px-3 py-3 shadow-sm">
          <p className="text-[11px] text-red-600">Urgentes</p>
          <p className="mt-1 text-lg font-semibold text-red-600">
            {urgentes}
          </p>
        </div>

        <div className="rounded-xl bg-white border border-orange-100 px-3 py-3 shadow-sm">
          <p className="text-[11px] text-orange-600">Vencidos</p>
          <p className="mt-1 text-lg font-semibold text-orange-600">
            {vencidos}
          </p>
        </div>

        <div className="rounded-xl bg-white border border-amber-100 px-3 py-3 shadow-sm">
          <p className="text-[11px] text-amber-700">Docs pendientes</p>
          <p className="mt-1 text-lg font-semibold text-amber-700">
            {docsPendientesCount}
          </p>
        </div>
      </section>

      {/* BUSCADOR + FILTROS */}
      <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-3 md:p-4 space-y-3">
        {/* Buscador */}
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título, cliente, dirección…"
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterEstado ?? ''}
            onChange={(e) =>
              setFilterEstado(e.target.value === '' ? null : e.target.value)
            }
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Todos los estados</option>
            {ESTADOS.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </select>

          <button
            onClick={() =>
              setFilterUrgente(filterUrgente === true ? null : true)
            }
            className={`px-3 py-2 rounded-lg text-xs border transition ${
              filterUrgente
                ? 'bg-red-50 border-red-300 text-red-700'
                : 'bg-white border-slate-300 text-slate-700'
            }`}
          >
            Urgentes
          </button>

          <button
            onClick={() =>
              setFilterVencido(filterVencido === true ? null : true)
            }
            className={`px-3 py-2 rounded-lg text-xs border transition ${
              filterVencido
                ? 'bg-orange-50 border-orange-300 text-orange-700'
                : 'bg-white border-slate-300 text-slate-700'
            }`}
          >
            Vencidos
          </button>

          <button
            onClick={() => setFilterDocsPendientes(!filterDocsPendientes)}
            className={`px-3 py-2 rounded-lg text-xs border transition ${
              filterDocsPendientes
                ? 'bg-amber-50 border-amber-300 text-amber-700'
                : 'bg-white border-slate-300 text-slate-700'
            }`}
          >
            Docs pendientes
          </button>

          <span className="hidden md:inline-block mx-2 h-5 w-px bg-slate-200" />

          <button
            onClick={() => setSortMode('default')}
            className={`px-3 py-2 rounded-lg text-xs border transition ${
              sortMode === 'default'
                ? 'bg-slate-900 border-slate-900 text-white'
                : 'bg-white border-slate-300 text-slate-700'
            }`}
          >
            Últimos mov.
          </button>

          <button
            onClick={() => setSortMode('docs')}
            className={`px-3 py-2 rounded-lg text-xs border transition ${
              sortMode === 'docs'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                : 'bg-white border-slate-300 text-slate-700'
            }`}
          >
            Menos docs
          </button>

          <button
            onClick={() => setSortMode('prioridad')}
            className={`px-3 py-2 rounded-lg text-xs border transition ${
              sortMode === 'prioridad'
                ? 'bg-red-50 border-red-300 text-red-700'
                : 'bg-white border-slate-300 text-slate-700'
            }`}
          >
            Prioridad
          </button>

          <button
            onClick={() => {
              setFilterEstado(null);
              setFilterUrgente(null);
              setFilterVencido(null);
              setFilterDocsPendientes(false);
              setSearch('');
              setSortMode('default');
            }}
            className="px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-700 bg-white hover:bg-slate-50"
          >
            Limpiar filtros
          </button>
        </div>
      </section>

      {/* LISTADO */}
      <section className="space-y-4">
        {/* Estado de carga / vacío */}
        {loading && (
          <div className="text-center text-sm text-slate-500 py-8">
            Cargando expedientes…
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center text-sm text-slate-500 py-8 bg-white border border-slate-200 rounded-xl">
            No hay expedientes que coincidan con los filtros.
          </div>
        )}

        {/* VISTA MÓVIL: CARDS */}
        <div className="space-y-3 md:hidden">
          {!loading &&
            filtered.length > 0 &&
            filtered.map((c) => {
              const { text: fechaTexto, color: fechaColor } = getFechaInfo(c);
              const totalDocs = c.docs_total ?? 0;
              const doneDocs = c.docs_completados ?? 0;
              const ratio =
                totalDocs > 0 ? Math.min(1, doneDocs / totalDocs) : 0;
              const docsTexto =
                totalDocs > 0 ? `${doneDocs}/${totalDocs}` : '-';

              let docsColor = 'text-slate-500';
              if (totalDocs > 0) {
                if (doneDocs === totalDocs) docsColor = 'text-emerald-600';
                else if (doneDocs === 0) docsColor = 'text-red-600';
                else docsColor = 'text-amber-600';
              }

              const prioridad = calcularPrioridad(c);
              let prioClasses =
                'bg-slate-100 text-slate-700 border-slate-200';
              if (prioridad.nivel === 'critica') {
                prioClasses = 'bg-red-50 text-red-700 border-red-200';
              } else if (prioridad.nivel === 'alta') {
                prioClasses = 'bg-orange-50 text-orange-700 border-orange-200';
              } else if (prioridad.nivel === 'media') {
                prioClasses = 'bg-yellow-50 text-yellow-700 border-yellow-200';
              }

              return (
                <div
                  key={c.id}
                  className="rounded-xl bg-white border border-slate-200 p-3 shadow-sm space-y-2"
                >
                  <div className="flex justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {c.titulo}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Último mov.:{' '}
                        {new Date(
                          c.updated_at
                        ).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                    {c.cliente_tiene_mensajes_nuevos && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Nuevo mensaje
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${getEstadoClasses(
                        c.estado
                      )}`}
                    >
                      {
                        ESTADOS.find((e) => e.value === c.estado)?.label ??
                        c.estado
                      }
                    </span>

                    {c.urgente && (
                      <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 border border-red-200">
                        ¡Urgente!
                      </span>
                    )}

                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${prioClasses}`}
                    >
                      {prioridad.label}{' '}
                      <span className="pl-1 text-[10px] opacity-70">
                        ({prioridad.score})
                      </span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <p className={`text-[11px] font-medium ${docsColor}`}>
                        Docs: {docsTexto}
                      </p>
                      <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-1.5 ${
                            totalDocs === 0
                              ? 'bg-slate-300'
                              : doneDocs === totalDocs
                              ? 'bg-emerald-500'
                              : 'bg-amber-400'
                          }`}
                          style={{ width: `${ratio * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="text-right">
                      <p className={`text-[11px] font-medium ${fechaColor}`}>
                        {fechaTexto}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Link
                      href={`/portal/case/${c.id}`}
                      className="inline-flex items-center justify-center rounded-lg border border-emerald-500 px-3 py-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50"
                    >
                      Abrir expediente
                    </Link>

                    <button
                      onClick={async () => {
                        await supabase
                          .from('casos')
                          .update({ urgente: !c.urgente })
                          .eq('id', c.id);

                        const updated = casos.map((x) =>
                          x.id === c.id ? { ...x, urgente: !c.urgente } : x
                        );
                        setCasos(updated);
                      }}
                      className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-3 py-1.5 text-[11px] text-slate-700 bg-white"
                    >
                      {c.urgente ? 'Quitar urgente' : 'Marcar urgente'}
                    </button>

                    <button
                      onClick={async () => {
                        const nuevo = !c.prioridad_manual_alta;
                        await supabase
                          .from('casos')
                          .update({ prioridad_manual_alta: nuevo })
                          .eq('id', c.id);

                        const updated = casos.map((x) =>
                          x.id === c.id
                            ? { ...x, prioridad_manual_alta: nuevo }
                            : x
                        );
                        setCasos(updated);
                      }}
                      className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-3 py-1.5 text-[11px] text-slate-700 bg-white"
                    >
                      {c.prioridad_manual_alta
                        ? 'Quitar prio alta'
                        : 'Prio alta'}
                    </button>
                  </div>
                </div>
              );
            })}
        </div>

        {/* ESCRITORIO: TABLA PRO */}
        {!loading && filtered.length > 0 && (
          <div className="hidden md:block bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            {/* Cabecera */}
            <div className="bg-slate-50 px-4 py-3 grid grid-cols-8 text-xs text-slate-500 font-medium">
              <div className="col-span-2">Expediente</div>
              <div>Estado</div>
              <div>Urgente</div>
              <div>Fecha límite</div>
              <div>Prioridad</div>
              <div>Documentación</div>
              <div className="text-right">Acciones</div>
            </div>

            {/* Filas */}
            <div className="divide-y divide-slate-200">
              {filtered.map((c) => {
                const { text: fechaTexto, color: fechaColor } = getFechaInfo(c);
                const totalDocs = c.docs_total ?? 0;
                const doneDocs = c.docs_completados ?? 0;
                const docsTexto =
                  totalDocs > 0 ? `${doneDocs}/${totalDocs}` : '-';
                const ratio =
                  totalDocs > 0 ? Math.min(1, doneDocs / totalDocs) : 0;

                let docsColor = 'text-slate-500';
                if (totalDocs > 0) {
                  if (doneDocs === totalDocs) {
                    docsColor = 'text-emerald-600';
                  } else if (doneDocs === 0) {
                    docsColor = 'text-red-600';
                  } else {
                    docsColor = 'text-amber-600';
                  }
                }

                const prioridad = calcularPrioridad(c);
                let prioridadClasses =
                  'border-slate-200 bg-slate-50 text-slate-700';
                if (prioridad.nivel === 'critica') {
                  prioridadClasses =
                    'border-red-200 bg-red-50 text-red-700';
                } else if (prioridad.nivel === 'alta') {
                  prioridadClasses =
                    'border-orange-200 bg-orange-50 text-orange-700';
                } else if (prioridad.nivel === 'media') {
                  prioridadClasses =
                    'border-yellow-200 bg-yellow-50 text-yellow-700';
                }

                return (
                  <div
                    key={c.id}
                    className="grid grid-cols-8 items-center px-4 py-3 text-sm hover:bg-slate-50"
                  >
                    {/* EXPEDIENTE */}
                    <div className="col-span-2">
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="font-medium text-slate-900">
                            {c.titulo}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Último mov.:{' '}
                            {new Date(
                              c.updated_at
                            ).toLocaleDateString('es-ES')}
                          </p>
                        </div>
                        {c.cliente_tiene_mensajes_nuevos && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Nuevo mensaje
                          </span>
                        )}
                      </div>
                    </div>

                    {/* ESTADO */}
                    <div>
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${getEstadoClasses(
                          c.estado
                        )}`}
                      >
                        {
                          ESTADOS.find((e) => e.value === c.estado)
                            ?.label ?? c.estado
                        }
                      </span>
                    </div>

                    {/* URGENTE */}
                    <div>
                      {c.urgente ? (
                        <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 border border-red-200">
                          ¡Urgente!
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </div>

                    {/* FECHA LÍMITE */}
                    <div>
                      <span className={`text-xs font-medium ${fechaColor}`}>
                        {fechaTexto}
                      </span>
                    </div>

                    {/* PRIORIDAD */}
                    <div>
                      <div
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[11px] ${prioridadClasses}`}
                      >
                        <span>{prioridad.label}</span>
                        <span className="text-[10px] opacity-70">
                          ({prioridad.score})
                        </span>
                        {c.prioridad_manual_alta && (
                          <span className="text-[10px] opacity-80">
                            · manual
                          </span>
                        )}
                      </div>
                    </div>

                    {/* DOCUMENTACIÓN */}
                    <div className="flex flex-col gap-1">
                      <span className={`text-xs font-medium ${docsColor}`}>
                        {docsTexto}
                      </span>
                      <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-1.5 ${
                            totalDocs === 0
                              ? 'bg-slate-300'
                              : doneDocs === totalDocs
                              ? 'bg-emerald-500'
                              : 'bg-amber-400'
                          }`}
                          style={{ width: `${ratio * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* ACCIONES */}
                    <div className="flex items-center justify-end gap-2 text-xs">
                      <Link
                        href={`/portal/case/${c.id}`}
                        className="text-emerald-700 hover:text-emerald-600 font-medium"
                      >
                        Abrir
                      </Link>

                      <button
                        onClick={async () => {
                          await supabase
                            .from('casos')
                            .update({ urgente: !c.urgente })
                            .eq('id', c.id);

                          const updated = casos.map((x) =>
                            x.id === c.id ? { ...x, urgente: !c.urgente } : x
                          );
                          setCasos(updated);
                        }}
                        className="text-red-600 hover:text-red-500"
                      >
                        {c.urgente ? 'Quitar' : 'Urgente'}
                      </button>

                      <button
                        onClick={async () => {
                          const nuevo = !c.prioridad_manual_alta;
                          await supabase
                            .from('casos')
                            .update({ prioridad_manual_alta: nuevo })
                            .eq('id', c.id);

                          const updated = casos.map((x) =>
                            x.id === c.id
                              ? { ...x, prioridad_manual_alta: nuevo }
                              : x
                          );
                          setCasos(updated);
                        }}
                        className="text-amber-600 hover:text-amber-500"
                      >
                        {c.prioridad_manual_alta
                          ? 'Quitar prio'
                          : 'Prio alta'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

