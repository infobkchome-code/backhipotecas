"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Cliente = {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  created_at: string;
};

export default function PortalHome() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClientes = async () => {
      const {
        data,
        error: fetchError,
      } = await supabase
        .from("clientes")
        .select("id, nombre, email, telefono, created_at")
        .order("created_at", { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setClientes(data || []);
      }

      setLoading(false);
    };

    fetchClientes();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
        {/* CABECERA */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Panel BKC · Clientes</h1>
            <p className="text-sm text-slate-400">
              Gestiona tus clientes y entra en cada expediente.
            </p>
          </div>

          <Link
            href="/portal/register"
            className="rounded-xl bg-emerald-500 hover:bg-emerald-400 px-4 py-2 text-sm font-medium text-slate-950"
          >
            + Nuevo cliente
          </Link>
        </header>

        {/* ERROR */}
        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            Error cargando clientes: {error}
          </div>
        )}

        {/* LISTADO */}
        {loading ? (
          <div className="text-sm text-slate-400">Cargando clientes...</div>
        ) : clientes.length === 0 ? (
          <div className="text-sm text-slate-400">
            Aún no tienes clientes. Agrega uno con el botón “Nuevo cliente”.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900/80">
                <tr className="text-left text-slate-400">
                  <th className="px-4 py-2">Nombre</th>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Teléfono</th>
                  <th className="px-4 py-2">Alta</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>

              <tbody>
                {clientes.map((c) => (
                  <tr
                    key={c.id}
                    className="border-t border-slate-800/70 hover:bg-slate-900 cursor-pointer"
                  >
                    <td className="px-4 py-2">{c.nombre}</td>
                    <td className="px-4 py-2 text-slate-300">{c.email}</td>
                    <td className="px-4 py-2 text-slate-300">
                      {c.telefono || "—"}
                    </td>
                    <td className="px-4 py-2 text-slate-400">
                      {new Date(c.created_at).toLocaleDateString("es-ES")}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Link
                        href={`/portal/case/${c.id}`}
                        className="text-emerald-400 hover:text-emerald-300 text-xs font-medium"
                      >
                        Ver expediente →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
