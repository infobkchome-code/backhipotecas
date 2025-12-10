"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

export default function LoginClient() {
  const sp = useSearchParams();

  // ejemplo típico: /portal/login?next=/portal/leads-valorador
  const next = useMemo(() => sp.get("next") || "/portal", [sp]);
  const error = useMemo(() => sp.get("error"), [sp]);

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6">
        <h1 className="text-xl font-semibold">Acceso CRM</h1>
        <p className="text-sm text-slate-600 mt-1">Inicia sesión para entrar al portal.</p>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* AQUÍ pega tu formulario real de login */}
        <div className="mt-5 text-sm text-slate-600">
          ✅ Login listo. Después de autenticar, redirige a:{" "}
          <span className="font-semibold">{next}</span>
        </div>
      </div>
    </main>
  );
}
