// app/seguimiento/[token]/page.tsx
import React from "react";

interface SeguimientoPageProps {
  params: { token: string };
}

export default function SeguimientoPage({ params }: SeguimientoPageProps) {
  const { token } = params;

  // Más adelante aquí haremos el fetch a Supabase con el token
  // y mostraremos el estado real del expediente.

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
        <div className="text-xs text-slate-400">
          Código de seguimiento:<br />
          <span className="font-mono text-slate-100">{token}</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-2">Estado del expediente</h2>
          <p className="text-sm text-slate-300">
            En estos momentos estamos procesando tu documentación. 
            Cuando conectemos esta página con la base de datos, aquí
            verás el estado detallado de cada fase: documentación, análisis,
            tasación, firma de FEIN/FIAE y firma en notaría.
          </p>
        </section>

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
            <li>📧 Email: <span className="font-medium">hipotecas@bkchome.es</span></li>
            <li>📞 Teléfono: <span className="font-medium">(+34) 000 000 000</span> (ajústalo tú)</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
