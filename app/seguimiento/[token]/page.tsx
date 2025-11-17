import React from "react";
import { createClient } from "@/lib/supabase/server";

interface SeguimientoPageProps {
  params: { token: string };
}

function getEstadoLabel(value: string | null | undefined) {
  switch (value) {
    case "en_estudio":
      return "En estudio";
    case "tasacion":
      return "Tasación";
    case "fein":
      return "FEIN / Oferta vinculante";
    case "notaria":
      return "Notaría";
    case "compraventa":
      return "Firma compraventa";
    case "fin":
      return "Expediente finalizado";
    case "denegado":
      return "Denegado";
    default:
      return "En estudio";
  }
}

export default async function SeguimientoPage({ params }: SeguimientoPageProps) {
  const { token } = params;

  const supabase = createClient();

  const { data, error } = await supabase
    .from("casos")
    .select("*")
    .eq("seguimiento_token", token)
    .single();

  // ❌ Token incorrecto o no existe
  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-6">
        <div className="max-w-lg bg-red-950/40 border border-red-800 rounded-xl p-6 space-y-3">
          <h1 className="text-lg font-semibold">Enlace de seguimiento no válido</h1>
          <p className="text-sm text-red-100">
            No hemos encontrado ningún expediente asociado a este enlace. Es
            posible que haya caducado o que se haya escrito de forma
            incorrecta.
          </p>
        </div>
      </div>
    );
  }

  const expediente: any = data;
  const estadoLabel = getEstadoLabel(expediente.estado);

  const progreso =
    typeof expediente.progreso === "number" && !Number.isNaN(expediente.progreso)
      ? Math.max(0, Math.min(100, expediente.progreso))
      : 0;

  const titular =
    expediente.nombre ||
    expediente.nombre_cliente ||
    expediente.titular ||
    null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">
            Seguimiento de tu expediente hipotecario
          </h1>
          <p className="text-sm text-slate-400">
            BKC Hipotecas · Enlace de seguimiento
          </p>
        </div>
        <div className="text-xs text-slate-400 text-right">
          Código de seguimiento:
          <br />
          <span className="font-mono text-slate-100">{token}</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        {/* 🟢 Bloque principal de estado */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold">Estado del expediente</h2>

          {titular && (
            <p className="text-sm text-slate-300">
              <span className="font-semibold">Titular: </span>
              {titular}
            </p>
          )}

          {expediente.titulo && (
            <p className="text-sm text-slate-300">
              <span className="font-semibold">Expediente: </span>
              {expediente.titulo}
            </p>
          )}

          <p className="text-sm text-slate-300">
            <span className="font-semibold">Estado actual: </span>
            {estadoLabel}
          </p>

          <div className="space-y-2">
            <p className="text-sm text-slate-300">
              <span className="font-semibold">Progreso aproximado: </span>
              {progreso}%
            </p>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-2 bg-emerald-500 transition-all"
                style={{ width: `${progreso}%` }}
              />
            </div>
          </div>

          <p className="text-sm text-slate-400">
            En estos momentos estamos procesando tu documentación. A medida que
            tu expediente avance, aquí verás reflejadas las distintas fases:
            estudio, tasación, FEIN/FIAE y firma en notaría.
          </p>

          {expediente.notas && (
            <div className="mt-3 border border-slate-800 rounded-lg bg-slate-950/60 p-3">
              <p className="text-xs font-semibold text-slate-300 mb-1">
                Comentarios del equipo de BKC
              </p>
              <p className="text-xs text-slate-300 whitespace-pre-line">
                {expediente.notas}
              </p>
            </div>
          )}
        </section>

        {/* 📞 Bloque de contacto */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
          <h3 className="text-base font-semibold mb-2">
            ¿Alguna duda sobre tu hipoteca?
          </h3>
          <p className="text-sm text-slate-300 mb-3">
            Si tienes cualquier consulta, puedes escribirnos indicando este
            código de seguimiento y uno de nuestros asesores de BKC Hipotecas
            te ayudará.
          </p>
          <ul className="text-sm text-slate-300 space-y-1">
            <li>
              📧 Email:{" "}
              <span className="font-medium">hipotecas@bkchome.es</span>
            </li>
            <li>
              📞 Teléfono:{" "}
              <span className="font-medium">(+34) 617 476 695</span>
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
