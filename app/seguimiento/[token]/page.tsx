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

const pasos = ['Documentación', 'Análisis', 'Tasación', 'Firma en notaría'];

function getPasoActivoFromProgress(progreso: number | null | undefined) {
  const p = progreso ?? 0;
  if (p >= 75) return 3;
  if (p >= 50) return 2;
  if (p >= 25) return 1;
  return 0;
}

function formatearEstado(estado: string | null | undefined) {
  if (!estado) return 'En estudio';
  return estado.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

function mensajePorEstado(estado: string | null | undefined) {
  const e = (estado || '').toLowerCase();

  if (e.includes('tasacion')) {
    return 'Tu expediente está en fase de tasación. Pronto tendremos el informe definitivo.';
  }
  if (e.includes('notaria')) {
    return 'Estamos preparando toda la documentación para la firma en notaría.';
  }
  if (e.includes('compraventa')) {
    return 'Estamos cerrando los últimos detalles de tu operación de compraventa.';
  }
  if (e.includes('cerrado')) {
    return 'Tu operación hipotecaria se ha completado. ¡Gracias por confiar en BKC Hipotecas!';
  }

  // Por defecto: en estudio / documentación / análisis
  return 'Nuestro equipo está analizando tu operación y las diferentes opciones de financiación.';
}

export default function SeguimientoPage({ params }: { params: { token: string } }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [caso, setCaso] = useState<Caso | null>(null);

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/seguimiento/${params.token}`);
        if (!res.ok) {
          setError('No hemos encontrado ningún expediente asociado a este enlace.');
          setLoading(false);
          return;
        }

        const data = (await res.json()) as SeguimientoResponse;

        if (!data.ok) {
          setError(data.error || 'No hemos encontrado ningún expediente asociado a este enlace.');
          setLoading(false);
          return;
        }

        setCaso(data.data);
      } catch (err: any) {
        console.error('Error cargando seguimiento:', err);
        setError('Ha ocurrido un error al cargar el expediente.');
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, [params.token]);

  // ⏳ Estado de carga
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-slate-900/60 border border-slate-800 rounded-2xl px-6 py-8 text-center space-y-3">
          <p className="text-sm text-slate-400">Cargando tu expediente hipotecario…</p>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full w-1/2 bg-emerald-500 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // ❌ Enlace no válido
  if (!caso || error) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <div className="max-w-lg w-full text-center space-y-6">
          <h1 className="text-2xl font-semibold">Enlace de seguimiento no válido</h1>
          <p className="text-sm text-slate-400">
            No hemos encontrado ningún expediente asociado a este enlace. Es posible que haya
            caducado o que se haya escrito de forma incorrecta.
          </p>
          <a
            href="https://bkchome.es"
            className="inline-flex items-center justify-center rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition"
          >
            Volver a BKC Hipotecas
          </a>
        </div>
      </div>
    );
  }

  const estadoLabel = formatearEstado(caso.estado);
  const mensajeEstado = mensajePorEstado(caso.estado);
  const progreso = caso.progreso ?? 0;
  const pasoActivo = getPasoActivoFromProgress(progreso);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* Cabecera */}
      <header className="border-b border-slate-900/70 bg-slate-950/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-emerald-400">
              BKC Hipotecas · Enlace de seguimiento
            </p>
            <h1 className="text-xl md:text-2xl font-semibold mt-1">
              Seguimiento de tu expediente hipotecario
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Aquí puedes ver en qué punto está tu operación en todo momento.
            </p>
          </div>

          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] uppercase tracking-[0.25em] text-slate-500">
              Código de seguimiento
            </span>
            <div className="flex items-center gap-2">
              <code className="text-[11px] bg-slate-900 border border-slate-700/70 rounded-md px-2 py-1 max-w-[210px] truncate">
                {caso.seguimiento_token}
              </code>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(caso.seguimiento_token)}
                className="text-[11px] rounded-md border border-slate-700 px-2 py-1 hover:bg-slate-800 transition"
              >
                Copiar
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido */}
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Estado principal */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 md:p-7">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                Estado del expediente
              </p>
              <h2 className="text-lg md:text-xl font-semibold">
                {caso.titulo || 'Expediente hipotecario'}
              </h2>

              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 mt-1">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-medium text-emerald-300">
                  Estado actual: {estadoLabel}
                </span>
              </div>

              <p className="text-sm text-slate-300 mt-3">{mensajeEstado}</p>
            </div>

            {/* Progreso numérico */}
            <div className="text-right">
              <p className="text-xs text-slate-400">Progreso aproximado</p>
              <p className="text-2xl font-semibold">
                {progreso}
                <span className="text-sm text-slate-400"> %</span>
              </p>
            </div>
          </div>

          {/* Barra de progreso */}
          <div className="mt-6 space-y-3">
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${Math.min(Math.max(progreso, 0), 100)}%` }}
              />
            </div>

            {/* Pasos */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mt-3">
              {pasos.map((paso, index) => {
                const completado = index < pasoActivo;
                const actual = index === pasoActivo;

                return (
                  <div
                    key={paso}
                    className={[
                      'rounded-xl border px-3 py-2.5 flex flex-col gap-1',
                      completado
                        ? 'border-emerald-500/70 bg-emerald-500/10'
                        : actual
                        ? 'border-emerald-500/40 bg-slate-900/80'
                        : 'border-slate-800 bg-slate-950/40',
                    ].join(' ')}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                        Paso {index + 1}
                      </span>
                      {completado ? (
                        <span className="text-[11px] text-emerald-400 font-medium">Completado</span>
                      ) : actual ? (
                        <span className="text-[11px] text-emerald-300 font-medium">En curso</span>
                      ) : (
                        <span className="text-[11px] text-slate-500">Pendiente</span>
                      )}
                    </div>
                    <p className="text-xs font-medium">{paso}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Tarjeta de contacto */}
        <section className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 md:p-7">
          <h3 className="text-sm font-semibold mb-2">¿Alguna duda sobre tu hipoteca?</h3>
          <p className="text-sm text-slate-400 mb-4">
            Si tienes cualquier consulta, puedes escribirnos indicando este código de seguimiento y
            uno de nuestros asesores de BKC Hipotecas te ayudará.
          </p>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-sm">
            <div className="space-y-1">
              <p>
                📧 Email:{' '}
                <a
                  href="mailto:hipotecas@bkchome.es"
                  className="text-emerald-400 hover:text-emerald-300 underline-offset-2 hover:underline"
                >
                  hipotecas@bkchome.es
                </a>
              </p>
              <p>
                📞 Teléfono:{' '}
                <a
                  href="tel:+34617476695"
                  className="text-emerald-400 hover:text-emerald-300 underline-offset-2 hover:underline"
                >
                  (+34) 617 476 695
                </a>
              </p>
            </div>

            <div className="text-xs text-slate-500 md:text-right">
              <p>Horario habitual de atención:</p>
              <p>Lunes a viernes · 9:30 a 14:00 y 17:00 a 20:30</p>
            </div>
          </div>
        </section>

        {/* Zona debug para ti */}
        <section className="bg-slate-950/60 border border-slate-900 rounded-2xl p-5 space-y-3">
          <details className="group">
            <summary className="flex items-center justify-between cursor-pointer">
              <span className="text-xs font-semibold text-slate-300">
                Datos completos del expediente (debug)
              </span>
              <span className="text-[11px] text-slate-500 group-open:hidden">Mostrar</span>
              <span className="text-[11px] text-slate-500 hidden group-open:inline">Ocultar</span>
            </summary>
            <pre className="mt-3 text-[11px] bg-slate-950 border border-slate-800 rounded-lg p-3 overflow-x-auto text-slate-300">
{JSON.stringify(caso, null, 2)}
            </pre>
          </details>
          <p className="text-[10px] text-slate-500">
            Esta información solo es útil para ti como asesor. El cliente puede verla, pero está
            pensada como apoyo interno.
          </p>
        </section>
      </main>
    </div>
  );
}
