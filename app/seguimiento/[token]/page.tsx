'use client';

import { useEffect, useState } from 'react';

type Expediente = {
  id: string;
  user_id?: string;
  cliente_id?: string;
  titulo?: string;
  estado?: string; // 'documentacion' | 'analisis' | 'tasacion' | 'notaria' | ...
  progreso?: number; // 0-100
  notas?: string;
  created_at?: string;
  updated_at?: string;
  email?: string | null;
  public_token?: string;
  seguimiento_token?: string;
};

type ApiResponse =
  | { ok: boolean; expediente?: Expediente; data?: Expediente; caso?: Expediente; message?: string }
  | Expediente;

interface PageProps {
  params: { token: string };
}

const STEPS = [
  { id: 'documentacion', label: 'Documentación' },
  { id: 'analisis', label: 'Análisis' },
  { id: 'tasacion', label: 'Tasación' },
  { id: 'notaria', label: 'Firma en notaría' },
];

function normalizarEstado(estado?: string | null): string {
  if (!estado) return '';
  return estado.toLowerCase().trim();
}

function getEstadoDescripcion(estado: string) {
  const e = normalizarEstado(estado);

  if (e === 'documentacion')
    return 'Estamos recopilando y revisando toda la documentación necesaria para tu hipoteca.';
  if (e === 'analisis')
    return 'Nuestro equipo está analizando tu operación y las diferentes opciones de financiación.';
  if (e === 'tasacion')
    return 'La vivienda se encuentra en fase de tasación por parte de una sociedad homologada.';
  if (e === 'notaria' || e === 'firma')
    return 'Tu hipoteca está lista para la firma en notaría. Pronto nos pondremos en contacto contigo para cerrar fecha y hora.';

  return 'Estamos trabajando en tu expediente. En breve verás aquí el detalle actualizado de cada fase.';
}

function getProgreso(expediente: Expediente | null): number {
  if (!expediente) return 0;
  if (typeof expediente.progreso === 'number') return expediente.progreso;

  const estado = normalizarEstado(expediente.estado);
  if (!estado) return 10;

  if (estado === 'documentacion') return 20;
  if (estado === 'analisis') return 45;
  if (estado === 'tasacion') return 70;
  if (estado === 'notaria' || estado === 'firma') return 95;

  return 10;
}

export default function SeguimientoPage({ params }: PageProps) {
  const { token } = params;

  const [expediente, setExpediente] = useState<Expediente | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelado = false;

    async function cargarExpediente() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/seguimiento/${token}`, {
          method: 'GET',
          cache: 'no-store',
        });

        if (!res.ok) {
          throw new Error('No hemos encontrado ningún expediente asociado a este enlace.');
        }

        const json: ApiResponse = await res.json();

        // Intentamos localizar la propiedad que contiene el expediente
        const e =
          (json as any).expediente ||
          (json as any).data ||
          (json as any).caso ||
          (json as any);

        if (!e || typeof e !== 'object') {
          throw new Error('No hemos podido cargar los datos del expediente.');
        }

        if (!cancelado) {
          setExpediente(e as Expediente);
        }
      } catch (err: any) {
        console.error(err);
        if (!cancelado) {
          setError(
            err?.message ||
              'Ha ocurrido un error al cargar el expediente. Por favor, revisa el enlace o contacta con nosotros.'
          );
        }
      } finally {
        if (!cancelado) setLoading(false);
      }
    }

    cargarExpediente();

    return () => {
      cancelado = true;
    };
  }, [token]);

  const progreso = getProgreso(expediente);
  const estadoNormalizado = normalizarEstado(expediente?.estado);
  const currentStepIndex =
    STEPS.findIndex((s) => s.id === estadoNormalizado) !== -1
      ? STEPS.findIndex((s) => s.id === estadoNormalizado)
      : Math.min(
          3,
          Math.floor((progreso / 100) * (STEPS.length === 0 ? 1 : STEPS.length))
        );

  async function handleCopy() {
    if (!expediente?.seguimiento_token) return;
    try {
      await navigator.clipboard.writeText(expediente.seguimiento_token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  }

  // ESTADOS DE CARGA / ERROR
  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <div className="max-w-md w-full px-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-slate-800 rounded w-2/3" />
            <div className="h-6 bg-slate-800 rounded w-full" />
            <div className="h-24 bg-slate-900 rounded-xl" />
          </div>
        </div>
      </main>
    );
  }

  if (error || !expediente) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <div className="max-w-lg w-full px-6 text-center space-y-6">
          <h1 className="text-2xl font-semibold">Enlace de seguimiento no válido</h1>
          <p className="text-slate-300">
            {error ||
              'No hemos encontrado ningún expediente asociado a este enlace. Es posible que haya caducado o que se haya escrito de forma incorrecta.'}
          </p>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium bg-sky-600 hover:bg-sky-500 transition"
          >
            Volver a BKC Hipotecas
          </a>
        </div>
      </main>
    );
  }

  // VISTA NORMAL
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="max-w-5xl mx-auto px-4 pb-16 pt-10">
        {/* Cabecera */}
        <header className="mb-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold">
              Seguimiento de tu expediente hipotecario
            </h1>
            <p className="text-slate-400 text-sm md:text-base">
              BKC Hipotecas · Enlace de seguimiento
            </p>
          </div>

          <div className="text-right text-xs md:text-sm text-slate-400">
            <p className="font-medium text-slate-300">Código de seguimiento</p>
            <div className="mt-1 flex items-center gap-2 justify-end">
              <code className="rounded-md bg-slate-900/80 px-3 py-1 text-[11px] md:text-xs">
                {expediente.seguimiento_token}
              </code>
              <button
                onClick={handleCopy}
                className="text-[11px] md:text-xs rounded-md border border-slate-700 px-2 py-1 hover:bg-slate-800 transition"
              >
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>
          </div>
        </header>

        <div className="space-y-6">
          {/* Estado del expediente */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 md:p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Estado del expediente</h2>
                <p className="text-xs md:text-sm text-slate-400">
                  Titular:{' '}
                  <span className="text-slate-100 font-medium">
                    {expediente.titulo || 'Pendiente de asignar'}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Estado actual:</span>
                <span className="inline-flex items-center rounded-full bg-sky-600/20 px-3 py-1 text-xs font-medium text-sky-300">
                  {estadoNormalizado
                    ? estadoNormalizado.charAt(0).toUpperCase() +
                      estadoNormalizado.slice(1)
                    : 'En curso'}
                </span>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              {getEstadoDescripcion(expediente.estado || '')}
            </p>
          </section>

          {/* Fases + barra de progreso */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 md:p-6 space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-100">
                  Progreso de tu hipoteca
                </h3>
                <p className="text-xs text-slate-400">
                  Vamos informándote a medida que tu expediente avanza por cada fase.
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs text-slate-400">Progreso aproximado</p>
                <p className="text-sm font-semibold text-slate-50">
                  {Math.round(progreso)}%
                </p>
              </div>
            </div>

            {/* Barra */}
            <div className="space-y-3">
              <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-sky-500 transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, progreso))}%` }}
                />
              </div>

              {/* Pasos */}
              <ol className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                {STEPS.map((step, index) => {
                  const isDone = index < currentStepIndex;
                  const isCurrent = index === currentStepIndex;

                  return (
                    <li
                      key={step.id}
                      className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2"
                    >
                      <div
                        className={[
                          'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold',
                          isDone
                            ? 'bg-emerald-500 text-slate-950'
                            : isCurrent
                            ? 'bg-sky-500 text-slate-950'
                            : 'bg-slate-800 text-slate-400',
                        ].join(' ')}
                      >
                        {index + 1}
                      </div>
                      <span
                        className={[
                          'truncate',
                          isDone || isCurrent
                            ? 'text-slate-100'
                            : 'text-slate-400',
                        ].join(' ')}
                      >
                        {step.label}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
          </section>

          {/* Contacto */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 md:p-6 space-y-3">
            <h3 className="text-sm font-semibold text-slate-100">
              ¿Alguna duda sobre tu hipoteca?
            </h3>
            <p className="text-sm text-slate-300">
              Si tienes cualquier consulta, puedes escribirnos indicando este código de
              seguimiento y uno de nuestros asesores de BKC Hipotecas te ayudará.
            </p>

            <div className="space-y-1 text-sm text-slate-200">
              <p>
                📧 Email:{' '}
                <a
                  href="mailto:hipotecas@bkchome.es"
                  className="text-sky-400 hover:underline"
                >
                  hipotecas@bkchome.es
                </a>
              </p>
              <p>
                📞 Teléfono:{' '}
                <a href="tel:+34617476695" className="text-sky-400 hover:underline">
                  (+34) 617 476 695
                </a>
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

  return 10;
}

export default function SeguimientoPage({ params }: PageProps) {
  const { token } = params;

  const [expediente, setExpediente] = useState<Expediente | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelado = false;

    async function cargarExpediente() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/seguimiento/${token}`, {
          method: 'GET',
          cache: 'no-store',
        });

        if (!res.ok) {
          throw new Error('No hemos encontrado ningún expediente asociado a este enlace.');
        }

        const json: ApiResponse = await res.json();

        // Intentamos localizar la propiedad que contiene el expediente
        const e =
          (json as any).expediente ||
          (json as any).data ||
          (json as any).caso ||
          (json as any);

        if (!e || typeof e !== 'object') {
          throw new Error('No hemos podido cargar los datos del expediente.');
        }

        if (!cancelado) {
          setExpediente(e as Expediente);
        }
      } catch (err: any) {
        console.error(err);
        if (!cancelado) {
          setError(
            err?.message ||
              'Ha ocurrido un error al cargar el expediente. Por favor, revisa el enlace o contacta con nosotros.'
          );
        }
      } finally {
        if (!cancelado) setLoading(false);
      }
    }

    cargarExpediente();

    return () => {
      cancelado = true;
    };
  }, [token]);

  const progreso = getProgreso(expediente);
  const estadoNormalizado = normalizarEstado(expediente?.estado);
  const currentStepIndex =
    STEPS.findIndex((s) => s.id === estadoNormalizado) !== -1
      ? STEPS.findIndex((s) => s.id === estadoNormalizado)
      : Math.min(
          3,
          Math.floor((progreso / 100) * (STEPS.length === 0 ? 1 : STEPS.length))
        );

  async function handleCopy() {
    if (!expediente?.seguimiento_token) return;
    try {
      await navigator.clipboard.writeText(expediente.seguimiento_token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  }

  // ESTADOS DE CARGA / ERROR
  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <div className="max-w-md w-full px-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-slate-800 rounded w-2/3" />
            <div className="h-6 bg-slate-800 rounded w-full" />
            <div className="h-24 bg-slate-900 rounded-xl" />
          </div>
        </div>
      </main>
    );
  }

  if (error || !expediente) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <div className="max-w-lg w-full px-6 text-center space-y-6">
          <h1 className="text-2xl font-semibold">Enlace de seguimiento no válido</h1>
          <p className="text-slate-300">
            {error ||
              'No hemos encontrado ningún expediente asociado a este enlace. Es posible que haya caducado o que se haya escrito de forma incorrecta.'}
          </p>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium bg-sky-600 hover:bg-sky-500 transition"
          >
            Volver a BKC Hipotecas
          </a>
        </div>
      </main>
    );
  }

  // VISTA NORMAL
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="max-w-5xl mx-auto px-4 pb-16 pt-10">
        {/* Cabecera */}
        <header className="mb-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold">
              Seguimiento de tu expediente hipotecario
            </h1>
            <p className="text-slate-400 text-sm md:text-base">
              BKC Hipotecas · Enlace de seguimiento
            </p>
          </div>

          <div className="text-right text-xs md:text-sm text-slate-400">
            <p className="font-medium text-slate-300">Código de seguimiento</p>
            <div className="mt-1 flex items-center gap-2 justify-end">
              <code className="rounded-md bg-slate-900/80 px-3 py-1 text-[11px] md:text-xs">
                {expediente.seguimiento_token}
              </code>
              <button
                onClick={handleCopy}
                className="text-[11px] md:text-xs rounded-md border border-slate-700 px-2 py-1 hover:bg-slate-800 transition"
              >
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>
          </div>
        </header>

        <div className="space-y-6">
          {/* Estado del expediente */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 md:p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Estado del expediente</h2>
                <p className="text-xs md:text-sm text-slate-400">
                  Titular:{' '}
                  <span className="text-slate-100 font-medium">
                    {expediente.titulo || 'Pendiente de asignar'}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Estado actual:</span>
                <span className="inline-flex items-center rounded-full bg-sky-600/20 px-3 py-1 text-xs font-medium text-sky-300">
                  {estadoNormalizado
                    ? estadoNormalizado.charAt(0).toUpperCase() +
                      estadoNormalizado.slice(1)
                    : 'En curso'}
                </span>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              {getEstadoDescripcion(expediente.estado || '')}
            </p>
          </section>

          {/* Fases + barra de progreso */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 md:p-6 space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-100">
                  Progreso de tu hipoteca
                </h3>
                <p className="text-xs text-slate-400">
                  Vamos informándote a medida que tu expediente avanza por cada fase.
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs text-slate-400">Progreso aproximado</p>
                <p className="text-sm font-semibold text-slate-50">
                  {Math.round(progreso)}%
                </p>
              </div>
            </div>

            {/* Barra */}
            <div className="space-y-3">
              <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-sky-500 transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, progreso))}%` }}
                />
              </div>

              {/* Pasos */}
              <ol className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                {STEPS.map((step, index) => {
                  const isDone = index < currentStepIndex;
                  const isCurrent = index === currentStepIndex;

                  return (
                    <li
                      key={step.id}
                      className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2"
                    >
                      <div
                        className={[
                          'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold',
                          isDone
                            ? 'bg-emerald-500 text-slate-950'
                            : isCurrent
                            ? 'bg-sky-500 text-slate-950'
                            : 'bg-slate-800 text-slate-400',
                        ].join(' ')}
                      >
                        {index + 1}
                      </div>
                      <span
                        className={[
                          'truncate',
                          isDone || isCurrent
                            ? 'text-slate-100'
                            : 'text-slate-400',
                        ].join(' ')}
                      >
                        {step.label}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
          </section>

          {/* Contacto */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 md:p-6 space-y-3">
            <h3 className="text-sm font-semibold text-slate-100">
              ¿Alguna duda sobre tu hipoteca?
            </h3>
            <p className="text-sm text-slate-300">
              Si tienes cualquier consulta, puedes escribirnos indicando este código de
              seguimiento y uno de nuestros asesores de BKC Hipotecas te ayudará.
            </p>

            <div className="space-y-1 text-sm text-slate-200">
              <p>
                📧 Email:{' '}
                <a
                  href="mailto:hipotecas@bkchome.es"
                  className="text-sky-400 hover:underline"
                >
                  hipotecas@bkchome.es
                </a>
              </p>
              <p>
                📞 Teléfono:{' '}
                <a href="tel:+34617476695" className="text-sky-400 hover:underline">
                  (+34) 617 476 695
                </a>
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

  return 10;
}

export default function SeguimientoPage({ params }: PageProps) {
  const { token } = params;

  const [expediente, setExpediente] = useState<Expediente | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelado = false;

    async function cargarExpediente() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/seguimiento/${token}`, {
          method: 'GET',
          cache: 'no-store',
        });

        if (!res.ok) {
          throw new Error('No hemos encontrado ningún expediente asociado a este enlace.');
        }

        const json: ApiResponse = await res.json();

        // Intentamos localizar la propiedad que contiene el expediente
        const e =
          (json as any).expediente ||
          (json as any).data ||
          (json as any).caso ||
          (json as any);

        if (!e || typeof e !== 'object') {
          throw new Error('No hemos podido cargar los datos del expediente.');
        }

        if (!cancelado) {
          setExpediente(e as Expediente);
        }
      } catch (err: any) {
        console.error(err);
        if (!cancelado) {
          setError(
            err?.message ||
              'Ha ocurrido un error al cargar el expediente. Por favor, revisa el enlace o contacta con nosotros.'
          );
        }
      } finally {
        if (!cancelado) setLoading(false);
      }
    }

    cargarExpediente();

    return () => {
      cancelado = true;
    };
  }, [token]);

  const progreso = getProgreso(expediente);
  const estadoNormalizado = normalizarEstado(expediente?.estado);
  const currentStepIndex =
    STEPS.findIndex((s) => s.id === estadoNormalizado) !== -1
      ? STEPS.findIndex((s) => s.id === estadoNormalizado)
      : Math.min(
          3,
          Math.floor((progreso / 100) * (STEPS.length === 0 ? 1 : STEPS.length))
        );

  async function handleCopy() {
    if (!expediente?.seguimiento_token) return;
    try {
      await navigator.clipboard.writeText(expediente.seguimiento_token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  }

  // ESTADOS DE CARGA / ERROR
  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <div className="max-w-md w-full px-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-slate-800 rounded w-2/3" />
            <div className="h-6 bg-slate-800 rounded w-full" />
            <div className="h-24 bg-slate-900 rounded-xl" />
          </div>
        </div>
      </main>
    );
  }

  if (error || !expediente) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <div className="max-w-lg w-full px-6 text-center space-y-6">
