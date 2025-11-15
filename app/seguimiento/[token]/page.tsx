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
    .from("casos") // si tu tabla se llama distinto, cámbialo aquí
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
            BKC Hipotecas · Enlace de seguimiento (VERSIÓN NUEVA)
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
