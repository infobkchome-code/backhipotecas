// app/seguimiento/[token]/page.tsx
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

type CasoPublico = {
  id: string;
  titulo: string | null;
  estado: string | null;
  progreso: number | null;
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

function estadoLabel(estado: string | null) {
  if (!estado) return 'En estudio';
  return ESTADO_LABEL[estado] ?? estado;
}

export default async function SeguimientoPage({
  params,
}: {
  params: { token: string };
}) {
  const token = params.token;

  // Buscar el caso por seguimiento_token
  const { data, error } = await supabase
    .from('casos')
    .select('id, titulo, estado, progreso, notas, created_at, updated_at')
    .eq('seguimiento_token', token)
    .single<CasoPublico>();

  if (error || !data) {
    // Enlace no válido o token que no existe
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full space-y-4 text-center">
          <h1 className="text-xl font-semibold">
            Enlace de seguimiento no válido
          </h1>
          <p className="text-sm text-slate-400">
            No hemos encontrado ningún expediente asociado a este enlace. Es
            posible que haya caducado o que se haya escrito de forma incorrecta.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400"
          >
            Volver a BKC Hipotecas
          </Link>
        </div>
      </div>
    );
  }

  const progresoSeguro =
    typeof data.progreso === 'number' && !Number.isNaN(data.progreso)
      ? Math.min(100, Math.max(0, data.progreso))
      : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">
            Seguimiento de tu expediente hipotecario
          </h1>
          <p className="text-xs text-slate-400">
            Este enlace te permite consultar el estado de tu expediente con BKC
            Hipotecas.
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-6 space-y-6">
        <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 space-y-4">
          <div className="flex flex-col gap-1">
            <p className="text-xs text-slate-400">Expediente</p>
            <h2 className="text-lg font-semibold">
              {data.titulo || 'Expediente hipotecario'}
            </h2>
            <p className="text-xs text-slate-500">
              Creado el{' '}
              {new Date(data.created_at).toLocaleDateString('es-ES')}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs text-slate-400 mb-1">Estado actual</p>
              <p className="text-sm font-medium">
                {estadoLabel(data.estado ?? null)}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-400 mb-1">
                Progreso aproximado
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-2 bg-emerald-500 transition-all"
                    style={{ width: ${progresoSeguro}% }}
                  />
                </div>
                <span className="text-xs text-slate-200">
                  {progresoSeguro}%
                </span>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs text-slate-400 mb-1">
              Comentarios del equipo
            </p>
            <p className="text-sm text-slate-100 whitespace-pre-wrap">
              {data.notas?.trim() ||
                'De momento no hay comentarios adicionales sobre tu expediente.'}
            </p>
          </div>

          <p className="text-[11px] text-slate-500">
            Última actualización:{' '}
            {new Date(data.updated_at).toLocaleString('es-ES')}
          </p>
        </section>
      </main>
    </div>
  );
}
