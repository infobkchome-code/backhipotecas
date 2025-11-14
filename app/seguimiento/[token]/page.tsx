// app/seguimiento/[token]/page.tsx
import { supabaseAdmin } from '@/lib/supabaseAdminClient';

type SeguimientoPageProps = {
  params: {
    token: string;
  };
};

type CasoSeguimiento = {
  id: string;
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

export default async function SeguimientoPage({ params }: SeguimientoPageProps) {
  const token = params.token;

  // Cargar el caso usando el token público
  const { data, error } = await supabaseAdmin
    .from('casos')
    .select('id, titulo, estado, progreso, notas, created_at, updated_at')
    .eq('seguimiento_token', token)
    .single();

  if (error || !data) {
    console.error('Error cargando expediente público:', error);

    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col items-center justify-center px-4 text-center">
        <h1 className="text-xl font-semibold mb-2">
          No se ha encontrado el expediente
        </h1>
        <p className="text-sm text-slate-400 max-w-md mb-4">
          Es posible que el enlace haya caducado, que se haya escrito mal o que
          haya sido desactivado. Contacta con tu asesor para obtener un nuevo
          enlace de seguimiento.
        </p>
      </div>
    );
  }

  const caso: CasoSeguimiento = {
    id: data.id,
    titulo: data.titulo,
    estado: data.estado,
    progreso: data.progreso ?? 0,
    notas: data.notas ?? null,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };

  const estadoLabel = ESTADO_LABEL[caso.estado] ?? caso.estado;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* Cabecera */}
      <header className="border-b border-slate-800 px-6 py-4">
        <h1 className="text-xl font-semibold">Seguimiento de tu expediente</h1>
        <p className="text-xs text-slate-400 mt-1">
          Estás viendo el estado actualizado de tu expediente hipotecario con
          BKC Hipotecas.
        </p>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 space-y-3">
          <div>
            <p className="text-xs text-slate-400 mb-1">Título del expediente</p>
            <p className="text-base font-medium">{caso.titulo}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-400 mb-1">Estado actual</p>
              <p className="inline-flex items-center rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-emerald-300">
                {estadoLabel}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">
                Progreso aproximado
              </p>
              <p className="text-sm font-medium">{caso.progreso ?? 0}%</p>
              <div className="mt-1 h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-2 bg-emerald-500 transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(0, Number(caso.progreso ?? 0))
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs text-slate-400 mb-1">
              Última actualización
            </p>
            <p className="text-xs text-slate-300">
              {new Date(caso.updated_at).toLocaleString('es-ES')}
            </p>
          </div>
        </section>

        <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 space-y-2">
          <h2 className="text-sm font-semibold text-slate-200">
            Comentarios de tu asesor
          </h2>
          {caso.notas ? (
            <p className="text-sm text-slate-200 whitespace-pre-wrap">
              {caso.notas}
            </p>
          ) : (
            <p className="text-sm text-slate-400">
              De momento no hay comentarios visibles. Tu asesor irá actualizando
              este espacio conforme avance la operación.
            </p>
          )}
        </section>

        <p className="text-[11px] text-slate-500 text-center">
          Si tienes dudas sobre el estado de tu expediente, contacta con tu
          asesor de BKC Hipotecas.
        </p>
      </main>
    </div>
  );
}
