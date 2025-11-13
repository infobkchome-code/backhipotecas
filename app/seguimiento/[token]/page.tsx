// app/seguimiento/[token]/page.tsx
import { supabaseAdmin } from '@/lib/supabaseAdminClient';
import Link from 'next/link';

type CasoPublico = {
  titulo: string;
  estado: string;
  progreso: number;
  notas: string | null;
  created_at: string;
  updated_at: string;
};

const ESTADO_LABEL: Record<string, string> = {
  en_estudio: 'En estudio',
  tasacion: 'Tasación',
  fein: 'FEIN / Oferta',
  notaria: 'Notaría',
  compraventa: 'Firma compraventa',
  fin: 'Expediente finalizado',
  denegado: 'Denegado',
};

function estadoLabel(estado: string) {
  return ESTADO_LABEL[estado] ?? estado;
}

export default async function SeguimientoPage({
  params,
}: {
  params: { token: string };
}) {
  const { token } = params;

  // Buscar el caso por public_token
  const { data, error } = await supabaseAdmin
    .from('casos')
    .select('titulo, estado, progreso, notas, created_at, updated_at')
    .eq('public_token', token)
    .maybeSingle();

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full space-y-4">
          <h1 className="text-xl font-semibold">
            Enlace de seguimiento no válido
          </h1>
          <p className="text-sm text-slate-400">
            El enlace puede estar caducado o no corresponder a ningún
            expediente activo.
          </p>
        </div>
      </div>
    );
  }

  const caso = data as CasoPublico;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
      <div className="max-w-xl w-full space-y-6 border border-slate-800 bg-slate-900/70 rounded-xl p-6">
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-emerald-400">
            Seguimiento de tu hipoteca
          </p>
          <h1 className="text-xl font-semibold">
            {caso.titulo || 'Expediente hipotecario'}
          </h1>
          <p className="text-xs text-slate-400">
            Información orientativa. Ante cualquier duda, contacta con BKC
            Hipotecas.
          </p>
        </header>

        {/* Estado y progreso */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Estado actual</p>
              <p className="text-sm font-medium text-slate-100">
                {estadoLabel(caso.estado)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Progreso estimado</p>
              <p className="text-sm font-medium text-slate-100">
                {caso.progreso ?? 0}%
              </p>
            </div>
          </div>
          <div className="mt-1 h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-2 bg-emerald-500 transition-all"
              style={{
                width: `${Math.min(100, Math.max(0, caso.progreso ?? 0))}%`,
              }}
            />
          </div>
        </section>

        {/* Notas para el cliente */}
        <section className="space-y-2">
          <p className="text-xs text-slate-400">Actualización</p>
          <p className="text-sm text-slate-100 whitespace-pre-wrap">
            {caso.notas && caso.notas.trim().length > 0
              ? caso.notas
              : 'Estamos trabajando en tu expediente. Te avisaremos en cuanto haya novedades.'}
          </p>
        </section>

        <footer className="border-t border-slate-800 pt-3 flex items-center justify-between">
          <p className="text-[11px] text-slate-500">
            Última actualización:{' '}
            {new Date(caso.updated_at).toLocaleString('es-ES')}
          </p>
          <div className="text-[11px] text-slate-500 text-right">
            BKC Hipotecas · Atención al cliente
            <br />
            <span className="text-emerald-400">617 476 695</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
