"use client";

import { FormEvent, useState } from "react";

export default function NewClientPage() {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [loading, setLoading] = useState(false);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setOkMsg(null);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/portal/create-client", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nombre, email, telefono }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se pudo crear el cliente");
      }

      setOkMsg("✅ Cliente creado correctamente.");
      setNombre("");
      setEmail("");
      setTelefono("");
    } catch (err: any) {
      setErrorMsg(err.message || "Error inesperado al crear el cliente");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg space-y-6">
        <header>
          <p className="text-xs uppercase tracking-wide text-emerald-400/80">
            Panel Hipotecas BKC
          </p>
          <h1 className="mt-1 text-2xl font-bold">
            Nuevo cliente
          </h1>
          <p className="mt-2 text-sm text-slate-300/80">
            Crea un cliente para hacer el seguimiento de su hipoteca
            (casos, documentos, mensajes…).
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl bg-slate-900/80 border border-slate-700/70 px-5 py-6 shadow-xl"
        >
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nombre completo</label>
            <input
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
              placeholder="Ej: Ángel y Ale"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
              placeholder="cliente@correo.com"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Teléfono</label>
            <input
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
              placeholder="+34 600 000 000"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Guardando..." : "Crear cliente"}
          </button>

          {okMsg && (
            <p className="mt-2 rounded-md bg-emerald-500/10 border border-emerald-500/40 px-3 py-2 text-xs text-emerald-300">
              {okMsg}
            </p>
          )}

          {errorMsg && (
            <p className="mt-2 rounded-md bg-red-500/10 border border-red-500/40 px-3 py-2 text-xs text-red-300">
              {errorMsg}
            </p>
          )}
        </form>

        <p className="text-[11px] text-slate-400/80">
          Los datos se guardan en Supabase en la tabla <code>clientes</code>,
          asociados a tu usuario de BKC (auth.users).
        </p>
      </div>
    </div>
  );
}

