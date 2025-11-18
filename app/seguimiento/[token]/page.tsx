'use client';

import { useEffect, useState } from 'react';

type Caso = {
  id: string;
  titulo: string | null;
  estado: string | null;
  progreso: number | null;
  notas: string | null;
  email: string | null;
  seguimiento_token: string;
  created_at: string;
  updated_at: string;
  [key: string]: any;
};

type SeguimientoResponse =
  | { ok: true; data: Caso }
  | { ok: false; error: string };

const PASOS = ['Documentación', 'Análisis', 'Tasación', 'Firma en notaría'];

/* ---- Helpers ---- */

function formatearEstado(estado: string | null | undefined) {
  if (!estado) return 'En estudio';
  return estado.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

function mensajePorEstado(estado: string | null | undefined) {
  const e = (estado || '').toLowerCase();

  if (e.includes('tasacion'))
    return 'Estamos realizando la tasación oficial de la vivienda.';
  if (e.includes('notaria'))
    return 'Estamos preparando toda la documentación final para la firma.';
  if (e.includes('cerrado'))
    return '¡Proceso completado! Gracias por confiar en BKC Hipotecas.';

  return 'Estamos trabajando en tu hipoteca y avanzando en cada etapa del proceso.';
}

function getPasoActivo(progreso: number | undefined | null) {
  const p = progreso ?? 0;
  if (p >= 75) return 3;
  if (p >= 50) return 2;
  if (p >= 25) return 1;
  return 0;
}

/* ---- PAGE ---- */

export default function SeguimientoPage({ params }: { params: { token: string } }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [caso, setCaso] = useState<Caso | null>(null);

  /* ---- LOAD CASE ---- */
  useEffect(() => {
    const cargar = async () => {
      setLoading(true);

      try {
        const res = await fetch(`/api/seguimiento/${params.token}`);

        if (!res.ok) {
          setError('No hemos encontrado ningún expediente asociado a este enlace.');
          setLoading(false);
          return;
        }

        const data = (await res.json()) as SeguimientoResponse;

        if (!data.ok) {
          setError(data.error);
          setLoading(false);
          return;
        }

        setCaso(data.data);
      } catch (e) {
        setError('Ha ocurrido un error al cargar el expediente.');
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, [params.token]);

  /* ---- ESTADOS ---- */

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <div className="bg-slate-900/60 border border-slate-800 px-6 py-8 rounded-2xl text-center space-y-4">
          <p className="text-sm text-slate-400">Cargando tu expediente…</p>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full w-1/2 bg-emerald-500 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !caso) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <div className="text-center max-w-lg space-y-6 px-6">
          <h1 className="text-2xl font-semibold">Enlace no válido</h1>
          <p className="text-slate-400 text-sm">{error}</p>
          <a
            href="https://bkchome.es"
            className="px-4 py-2 rounded-md bg-emerald-500 text-slate-950 text-sm font-semibold hover:bg-emerald-400"
          >
            Volver a BKC Hipotecas
          </a>
        </div>
      </div>
    );
  }

  /* ---- DATA ---- */

  const estado = formatearEstado(caso.estado);
  const mensaje = mensajePorEstado(caso.estado);
  const progreso = caso.progreso ?? 0;
  const pasoActivo = getPasoActivo(progreso);

  /* ---- UI ---- */

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* HEADER */}
      <header className="border-b border-slate-900/60 bg-slate-950/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 py-5 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-400">
              BKC HIPOTECAS
            </p>
            <h1 className="text-xl md:text-2xl font-semibold">
              Estado de tu expediente hipotecario
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Información actualizada en tiempo real
            </p>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-widest text-slate-500">
              Código
            </span>
            <code className="text-[11px] bg-slate-900 border border-slate-800 rounded-md px-2 py-1 max-w-[200px] truncate">
              {caso.seguimiento_token}
            </code>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* ESTADO */}
        <section className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-5">
          <div className="flex justify-between flex-col md:flex-row gap-4">
            <div>
              <h2 className="text-lg font-semibold">{caso.titulo}</h2>

              <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-medium text-emerald-300">
                  Estado: {estado}
                </span>
              </div>

              <p className="text-sm text-slate-300 mt-3">{mensaje}</p>
            </div>

            <div className="text-right">
              <p className="text-xs text-slate-400">Progreso</p>
              <p className="text-3xl font-semibold">
                {progreso}
                <span className="text-sm text-slate-400">%</span>
              </p>
            </div>
          </div>

          {/* Barra */}
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${progreso}%` }}
            />
          </div>
        </section>

        {/* PASOS */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {PASOS.map((paso, i) => {
            const completado = i < pasoActivo;
            const actual = i === pasoActivo;

            return (
              <div
                key={paso}
                className={[
                  'p-4 rounded-xl border space-y-2',
                  completado
                    ? 'border-emerald-500/60 bg-emerald-500/10'
                    : actual
                    ? 'border-emerald-500/40 bg-slate-900'
                    : 'border-slate-800 bg-slate-950',
                ].join(' ')}
              >
                <p className="text-[10px] uppercase tracking-widest text-slate-400">
                  Paso {i + 1}
                </p>
                <p className="text-sm font-medium">{paso}</p>

                {completado && (
                  <span className="text-[11px] text-emerald-400">Completado</span>
                )}
                {actual && (
                  <span className="text-[11px] text-emerald-300">En curso</span>
                )}
                {!completado && !actual && (
                  <span className="text-[11px] text-slate-500">Pendiente</span>
                )}
              </div>
            );
          })}
        </section>

        {/* CONTACTO */}
        <section className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
          <h3 className="text-sm font-semibold mb-2">¿Dudas con tu hipoteca?</h3>
          <p className="text-sm text-slate-400 mb-4">
            Escríbenos indicando tu código de seguimiento y un asesor te
            responderá lo antes posible.
          </p>

          <p>📧 <a href="mailto:hipotecas@bkchome.es" className="text-emerald-400 underline">hipotecas@bkchome.es</a></p>
          <p>📞 <a href="tel:+34617476695" className="text-emerald-400 underline">617 476 695</a></p>
        </section>
      </main>
    </div>
  );
}
