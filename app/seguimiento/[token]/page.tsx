// app/seguimiento/[token]/page.tsx

import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

type PageProps = {
  params: { token: string };
};

type CasoPublico = {
  titulo: string;
  estado: string;
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

function estadoBonito(estado: string) {
  return ESTADO_LABEL[estado] ?? estado;
}

export default async function SeguimientoPage({ params }: PageProps) {
  const { token } = params;

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col items-center justify-center px-4">
        <p className="text-lg font-semibold mb-2">
          Enlace de seguimiento no válido
        </p>
        <p className="text-sm text-slate-400 mb-4">
          El enlace parece estar incompleto o caducado.
        </p>
      </div>
    );
  }

  // Usamos el cliente público normal
  const { data, error } = await supabase
    .from('casos')
    .select('titulo, estado, progreso, notas, created_at, updated_at')
    .eq('seguimiento_token', token)
    .maybeSingle();

  if (error || !data) {
    console.error('Error cargando caso por token:', error);
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col items-center justify-center px-4">
        <p className="text-lg font-semibold mb-2">Expediente no encontrado</p>
        <p className="text-sm text-slate-400 mb-4">
          Puede que el enlace no sea correcto o que el expediente ya no esté
          disponible.
        </p>
        <Link
          href="/"
          className="text-emerald-400 text-sm hover:underline"
        >
          ← Volver a la página principal de BKC Home
        </Link>
      </div>
    );
  }

  const caso = data as CasoPublico;

  const progresoSeguro =
    typeof caso.progreso === 'number'
      ? Math.min(100, Math.max(0, caso.progreso))
      : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Seguimiento de tu hipoteca</h1>
          <p className="text-xs text-slate-400">
            Expediente creado el{' '}
            {new Date(caso.created_at).toLocaleDateString('es-ES')}
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-6 space-y-6">
        <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-200">
            Estado del expediente
          </h2>
          <p className="text-base font-medium text-emerald-400">
            {estadoBonito(caso.estado)}
          </p>

          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Progreso aproximado</span>
              <span>{progresoSeguro}%</span>
            </div>
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-2 bg-emerald-500 transition-all"
                style={{ width: `${progresoSeguro}%` }}
              />
            </div>
          </div>

          {caso.notas && (
            <div className="mt-2">
              <h3 className="text-xs font-semibold text-slate-400 mb-1">
                Comentarios de tu gestor
              </h3>
              <p className="text-sm text-slate-100 whitespace-pre-wrap">
                {caso.notas}
              </p>
            </div>
          )}
        </section>

        <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 space-y-2 text-xs text-slate-400">
          <p>
            Este enlace es solo informativo. Si tienes cualquier duda sobre tu
            hipoteca, puedes contactar con tu gestor de BKC Home.
          </p>
        </section>
      </main>
    </div>
  );
}
