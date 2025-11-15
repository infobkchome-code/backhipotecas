// app/seguimiento/[token]/page.tsx
import React from "react";
import { createClient } from "@/lib/supabase/server";

interface SeguimientoPageProps {
  params: { token: string };
}

export default async function SeguimientoPage({ params }: SeguimientoPageProps) {
  const { token } = params;

  const supabase = createClient();

  const { data, error } = await supabase
    .from("casos") // <- tu tabla, la misma que usas en la API
    .select("*")
    .eq("seguimiento_token", token)
    .single();

  const expediente: any = data;
  const enlaceNoValido = !!error || !expediente;

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

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {enlaceNoValido ? (
          // 🔴 Token NO válido
          <section className="bg-red-950/40 border border-red-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-2">
              Enlace de seguimiento no válido
            </h2>
            <p className="text-sm text-red-100">
              No hemos encontrado ningún expediente asociado a este enlace. Es
              posible que haya caducado o que se haya escrito de forma
              incorrecta.
            </p>
          </section>
        ) : (
          // 🟢 Token correcto: mostramos datos del expediente
          <>
            <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-3">
              <h2 className="text-lg font-semibold">Estado del expediente</h2>

              <p className="text-sm text-slate-300">
                <span className="font-semibold">Titular: </span>
                {expediente.nombre ||
                  expediente.nombre_cliente ||
                  expediente.titular ||
                  "—"}
              </p>

              <p className="text-sm text-slate-300">
                <span className="font-semibold">Estado actual: </span>
                {expediente.estado || "En estudio"}
              </p>

              <p className="text-sm text-slate-400">
                En estos momentos estamos procesando tu documentación. Más
                adelante verás aquí el detalle de cada fase: documentación,
                análisis, tasación y firma en notaría.
              </p>
            </section>
          </>
        )}

        <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
          <h3 className="text-base font-semibold mb-2">
            ¿Alguna duda sobre tu hipoteca?
          </h3>
          <p className="text-sm text-slate-300 mb-3">
            Si tienes cualquier consulta, puedes escribirnos indicando este
            código de seguimiento y uno de nuestros asesores de BKC Hipotecas te
            ayudará.
          </p>
          <ul className="text-sm text-slate-300 space-y-1">
            <li>
              📧 Email: <span className="font-medium">hipotecas@bkchome.es</span>
            </li>
            <li>
              📞 Teléfono:{" "}
              <span className="font-medium">(+34) 000 000 000</span> (ajústalo tú)
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
