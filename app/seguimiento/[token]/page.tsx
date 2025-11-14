// app/seguimiento/[token]/page.tsx
import { supabase } from '@/lib/supabaseClient';

interface SeguimientoPageProps {
  params: { token: string };
}

const ESTADO_LABEL: Record<string, string> = {
  en_estudio: 'En estudio',
  tasacion: 'Tasación',
  fein_fein: 'FEIN / Oferta',
  denegado: 'Denegado',
  firmado: 'Firmado',
};

export default async function SeguimientoPage({ params }: SeguimientoPageProps) {
  const { token } = params;

  // Buscar el caso por el token
  const { data: caso, error } = await supabase
    .from('casos')
    .select(
      `
      id,
      titulo,
      estado,
      progreso,
      notas_internas,
      created_at,
      updated_at,
      clientes:clientes (
        nombre,
        email,
        telefono
      )
    `,
    )
    .eq('seguimiento_token', token)
    .single();

  if (error || !caso) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-50 px-4">
        <h1 className="text-2xl font-semibold mb-4 text-center">
          Enlace de seguimiento no válido
        </h1>
        <p className="mb-6 text-slate-300 text-center max-w-md">
          No hemos encontrado ningún expediente asociado a este enlace. Es posible que haya
          caducado o que se haya escrito de forma incorrecta.
        </p>
        <a
          href="https://bkchome.es"
          className="px-4 py-2 rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-medium"
        >
          Volver a BKC Hipotecas
        </a>
      </main>
    );
  }

  const estadoLabel = ESTADO_LABEL[caso.estado] ?? caso.estado;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex justify-center px-4 py-10">
      <div className="w-full max-w-3xl bg-slate-900/70 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl shadow-black/40">
        <header className="mb-6">
          <p className="text-sm uppercase tracking-[0.2em] text-emerald-400 mb-1">
            BKC HIPOTECAS
          </p>
          <h1 className="text-2xl md:text-3xl font-semibold">
            Seguimiento de tu expediente
          </h1>
          <p className="text-slate-300 mt-2">
            Aquí puedes ver en qué estado se encuentra tu operación hipotecaria.
          </p>
        </header>

        <section className="mb-6 grid gap-4 md:grid-cols-2">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h2 className="text-sm font-medium text-slate-400 mb-1">Cliente</h2>
            <p className="font-semibold">
              {caso.clientes?.nombre ?? 'Cliente BKC'}
            </p>
            {caso.clientes?.email && (
              <p className="text-sm text-slate-300">{caso.clientes.email}</p>
            )}
            {caso.clientes?.telefono && (
              <p className="text-sm text-slate-300">{caso.clientes.telefono}</p>
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h2 className="text-sm font-medium text-slate-400 mb-1">Expediente</h2>
            <p className="font-semibold">{caso.titulo}</p>
            <p className="text-sm text-slate-300 mt-1">
              Estado:{' '}
              <span className="font-semibold text-emerald-400">{estadoLabel}</span>
            </p>
            <p className="text-sm text-slate-300 mt-1">
              Progreso aproximado:{' '}
              <span className="font-semibold">{caso.progreso ?? 0}%</span>
            </p>
          </div>
        </section>

        <section className="mb-6">
          <h2 className="text-sm font-medium text-slate-400 mb-2">
            Línea de progreso
          </h2>
          <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
            <div
              className="h-3 bg-emerald-500 transition-all"
              style={{ width: `${caso.progreso ?? 0}%` }}
            />
          </div>
        </section>

        <section>
          <h2 className="text-sm font-medium text-slate-400 mb-2">
            Comentarios de tu asesor
          </h2>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 whitespace-pre-wrap">
            {caso.notas_internas?.trim()
              ? caso.notas_internas
              : 'Tu expediente está en curso. Cuando haya novedades importantes, las verás reflejadas aquí.'}
          </div>
        </section>

        <footer className="mt-8 text-xs text-slate-500 text-center">
          Cualquier duda, contacta con tu asesor BKC Hipotecas.
        </footer>
      </div>
    </main>
  );
}
