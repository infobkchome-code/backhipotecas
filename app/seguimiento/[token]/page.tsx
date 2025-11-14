// app/seguimiento/[token]/page.tsx

import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdminClient";

type SeguimientoPageProps = {
  params: {
    token: string;
  };
};

const ESTADO_LABEL: Record<string, string> = {
  en_estudio: "En estudio",
  tasacion: "Tasación",
  ofer: "Oferta",
  firmada: "Firmada",
  denegado: "Denegado",
};

export default async function SeguimientoPage({ params }: SeguimientoPageProps) {
  const { token } = params;

  // 🔍 Buscar el caso por el seguimiento_token
  const { data: caso, error } = await supabaseAdmin
    .from("casos")
    .select(
      `
      id,
      titulo,
      estado,
      progreso,
      notas_internas,
      created_at,
      updated_at,
      clientes:clientes!inner (
        nombre
      )
    `
    )
    .eq("seguimiento_token", token)
    .maybeSingle(); // si no hay resultado, devuelve null en vez de lanzar error

  if (error) {
    console.error("Error buscando caso por token:", error);
  }

  // ❌ Si no hay caso → enlace no válido
  if (!caso) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-slate-900/70 border border-slate-800 rounded-xl p-6 shadow-lg">
          <h1 className="text-xl font-semibold mb-2 text-center">
            Enlace de seguimiento no válido
          </h1>
          <p className="text-sm text-slate-300 mb-4 text-center">
            No hemos encontrado ningún expediente asociado a este enlace.
            Es posible que haya caducado o que se haya escrito de forma incorrecta.
          </p>
          <div className="flex justify-center">
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 rounded-md bg-emerald-500 hover:bg-emerald-400 text-sm font-medium text-slate-950 transition-colors"
            >
              Volver a BKC Hipotecas
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const estadoLegible = ESTADO_LABEL[caso.estado] ?? caso.estado;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
      <div className="max-w-xl w-full bg-slate-900/70 border border-slate-800 rounded-xl p-6 shadow-lg space-y-4">
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">
            Seguimiento de expediente
          </p>
          <h1 className="text-2xl font-semibold">
            {caso.titulo || "Tu expediente hipotecario"}
          </h1>
          <p className="text-sm text-slate-300">
            Cliente:{" "}
            <span className="font-medium">
              {caso.clientes?.nombre || "Sin nombre"}
            </span>
          </p>
        </header>

        {/* Estado */}
        <section className="space-y-2">
          <p className="text-sm text-slate-300">
            Estado actual:{" "}
            <span className="font-semibold text-emerald-400">
              {estadoLegible}
            </span>
          </p>

          {/* Barra de progreso simple */}
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-2 bg-emerald-500 transition-all"
              style={{ width: `${caso.progreso ?? 0}%` }}
            />
          </div>
          <p className="text-xs text-slate-400">
            Progreso aproximado: {caso.progreso ?? 0}%
          </p>
        </section>

        {/* Notas para el cliente */}
        {caso.notas_internas && (
          <section className="space-y-1">
            <h2 className="text-sm font-semibold">Notas de tu gestor</h2>
            <p className="text-sm text-slate-200 whitespace-pre-line">
              {caso.notas_internas}
            </p>
          </section>
        )}

        <footer className="pt-2 border-t border-slate-800 mt-2 text-xs text-slate-400 flex justify-between">
          <span>
            Expediente creado:{" "}
            {new Date(caso.created_at).toLocaleDateString("es-ES")}
          </span>
          <span>
            Última actualización:{" "}
            {new Date(caso.updated_at ?? caso.created_at).toLocaleDateString(
              "es-ES"
            )}
          </span>
        </footer>
      </div>
    </main>
  );
}
