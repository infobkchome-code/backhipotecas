"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

type CasoListado = {
  id: string;
  titulo: string;
  estado: string;
  progreso: number;
  created_at: string;
  seguimiento_token: string;
  cliente: {
    nombre: string;
    email: string;
    telefono: string | null;
  };
};

export default function PortalPage() {
  const [casos, setCasos] = useState<CasoListado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarCasos = async () => {
    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Debes iniciar sesión para ver tus expedientes.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("casos")
        .select(
          `
          id,
          titulo,
          estado,
          progreso,
          created_at,
          seguimiento_token,
          cliente:clientes (
            nombre,
            email,
            telefono
          )
        `
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        setError("No se han podido cargar los clientes.");
      } else {
        setCasos(data as any);
      }
    } catch (err) {
      console.error(err);
      setError("Error inesperado al cargar los expedientes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarCasos();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* HEADER */}
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-emerald-400">
            BKC Hipotecas · Panel interno
          </p>
          <h1 className="text-xl font-semibold mt-1">
            Clientes y expedientes (PRUEBA)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Desde aquí ves todos tus clientes y accedes a su expediente.
          </p>
        </div>

        <Link
          href="/portal/clients/new"
          className="rounded-md bg-emerald-500 text-slate-950 text-sm font-semibold px-4 py-2 hover:bg-emerald-400 transition"
        >
          + Nuevo cliente
        </Link>
      </header>

      {/* CONTENIDO */}
      <main className="px-6 py-6 max-w-6xl mx-auto">
        {error && (
          <div className="rounded-md border border-red-700 bg-red-950/50 text-red-200 px-4 py-2 mb-4">
            {error}
          </div>
        )}

        {/* LOADING */}
        {loading && (
          <p className="text-slate-400 text-sm">Cargando expedientes…</p>
        )}

        {/* TABLA */}
        {!loading && casos.length === 0 && (
          <p className="text-slate-400 text-sm">
            No hay clientes con los filtros actuales.
          </p>
        )}

        {!loading && casos.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-800 text-xs">
                  <th className="py-2">Cliente</th>
                  <th className="py-2">Contacto</th>
                  <th className="py-2">Fechas</th>
                  <th className="py-2">Expediente</th>
                  <th className="py-2">Progreso</th>
                  <th className="py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {casos.map((c) => (
                  <tr key={c.id} className="border-b border-slate-900">
                    {/* CLIENTE */}
                    <td className="py-2 font-medium">{c.cliente?.nombre}</td>

                    {/* CONTACTO */}
                    <td className="py-2 text-slate-300">
                      {c.cliente?.email}
                      <br />
                      <span className="text-xs text-slate-500">
                        {c.cliente?.telefono ?? ""}
                      </span>
                    </td>

                    {/* FECHA */}
                    <td className="py-2 text-slate-400">
                      Alta:{" "}
                      {new Date(c.created_at).toLocaleDateString("es-ES")}
                    </td>

                    {/* EXPEDIENTE */}
                    <td className="py-2 font-medium">{c.titulo}</td>

                    {/* PROGRESO */}
                    <td className="py-2 text-slate-300">{c.progreso}%</td>

                    {/* ACCIONES */}
                    <td className="py-2 flex flex-col gap-2">
                      <Link
                        href={`/portal/case/${c.id}`}
                        className="text-emerald-400 hover:text-emerald-300 text-xs underline"
                      >
                        Ver expediente →
                      </Link>

                      {/* BOTÓN QUE SIEMPRE APARECE */}
                      <Link
                        href={`/seguimiento/${c.seguimiento_token}`}
                        target="_blank"
                        className="text-emerald-300 hover:text-emerald-200 text-xs underline"
                      >
                        Ver como cliente →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
