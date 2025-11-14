import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabaseAdminClient';


type CasoSeguimiento = {
  id: string;
  titulo: string;
  estado: string;
  progreso: number;
  created_at: string;
  updated_at: string;
};

interface SeguimientoPageProps {
  params: {
    token: string;
  };
}

// Mapa de estados a texto más "humano"
const ESTADOS_LABEL: Record<string, string> = {
  en_estudio: 'En estudio',
  tasacion: 'Tasación',
  fein: 'FEIN / Oferta',
  notaria: 'Notaría',
  compraventa: 'Firma compraventa',
  fin: 'Expediente finalizado',
  denegado: 'Denegado',
};

export default async function SeguimientoPage({ params }: SeguimientoPageProps) {
  const { token } = params;

  // Buscamos el caso por su tracking_token
  const { data, error } = await supabaseAdmin
    .from('casos')
    .select('id, titulo, estado, progreso, created_at, updated_at')
    .eq('tracking_token', token)
    .single();

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full space-y-4 text-center">
          <h1 className="text-xl font-semibold">
            Enlace de seguimiento no válido
          </h1>
          <p className="text-sm text-slate-400">
            Puede que el enlace haya caducado, no exista o se haya revocado.
          </p>
          <p className="text-xs text-slate-500">
            Si crees que es un error, contacta con tu asesor en Hipotecas BKC.
          </p>
          <Link
            href="https://hipotecasbkc.es"
            className="inline-flex mt-4 items-center justify-center rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-medium px-4 py-2 transition"
          >
            Ir a Hipotecas BKC
          </Link>
        </div>
      </div>
    );
  }

  const caso = data as CasoSeguimiento;
  const estadoLabel = ESTADOS_LABEL[caso.estado] ?? caso.estado;
  const progreso = Math.min(100, Math.max(0, caso.progreso ?? 0));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
      <div className="max-w-xl w-full space-y-6">
        {/* Cabecera */}
        <header className="space-y-1">
          <p className="text-xs text-emerald-400 uppercase tracking-wide">
            Seguimiento de expediente
          </p>
          <h1 className="text-2xl font-semibold">
            {caso.titulo || 'Tu expediente hipotecario'}
          </h1>
          <p className="text-xs text-slate-400">
            Última actualización:{' '}
            {new Date(caso.updated_at || caso.created_at).toLocaleString(
              'es-ES',
            )}
          </p>
        </header>

        {/* Tarjeta principal */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Estado actual</p>
              <p className="text-sm font-medium text-slate-50">
                {estadoLabel}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Progreso aproximado</p>
              <p className="text-sm font-semibold text-emerald-400">
                {progreso}%
              </p>
            </div>
          </div>

          {/* Barra de progreso */}
          <div className="mt-2">
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-2 bg-emerald-500 transition-all"
                style={{ width: `${progreso}%` }}
              />
            </div>
          </div>

          {/* Línea temporal simplificada */}
          <div className="mt-4 space-y-2">
            <p className="text-xs text-slate-400">Fases del proceso</p>
            <ol className="space-y-1 text-xs">
              {[
                { key: 'en_estudio', label: 'Estudio y viabilidad' },
                { key: 'tasacion', label: 'Tasación de la vivienda' },
                { key: 'fein', label: 'FEIN / Oferta del banco' },
                { key: 'notaria', label: 'Revisión notaría' },
                { key: 'compraventa', label: 'Firma compraventa e hipoteca' },
                { key: 'fin', label: 'Expediente finalizado' },
              ].map((step) => {
                const isDone =
                  pasoOrden(step.key) <= pasoOrden(caso.estado || '');
                const isCurrent = step.key === caso.estado;

                return (
                  <li
                    key={step.key}
                    className="flex items-center gap-2 text-slate-300"
                  >
                    <span
                      className={[
                        'inline-flex h-4 w-4 items-center justify-center rounded-full border text-[9px]',
                        isDone
                          ? 'border-emerald-400 bg-emerald-500 text-slate-950'
                          : 'border-slate-600 text-slate-400',
                      ].join(' ')}
                    >
                      {isDone ? '✓' : ''}
                    </span>
                    <span
                      className={
                        isCurrent ? 'font-semibold text-emerald-400' : ''
                      }
                    >
                      {step.label}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>

          <p className="mt-4 text-[11px] text-slate-500">
            Esta información es orientativa y puede variar según la entidad,
            plazos de tasación y notaría. Para cualquier duda, contacta con tu
            asesor de Hipotecas BKC.
          </p>
        </section>
      </div>
    </div>
  );
}

/**
 * Orden numérico de los estados para pintar la línea temporal
 */
function pasoOrden(estado: string): number {
  switch (estado) {
    case 'en_estudio':
      return 1;
    case 'tasacion':
      return 2;
    case 'fein':
      return 3;
    case 'notaria':
      return 4;
    case 'compraventa':
      return 5;
    case 'fin':
      return 6;
    case 'denegado':
      return 99;
    default:
      return 0;
  }
}

