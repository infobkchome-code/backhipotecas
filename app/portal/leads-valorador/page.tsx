"use client";

import { useEffect, useMemo, useState } from "react";

type Lead = any;

function fmtEUR(n: number | null | undefined) {
  if (n == null) return "—";
  return Number(n).toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
}

export default function LeadsValoradorPage() {
  const [q, setQ] = useState("");
  const [exported, setExported] = useState<"" | "no" | "yes">("no");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Lead[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const sp = new URLSearchParams();
      if (q.trim()) sp.set("q", q.trim());
      if (exported) sp.set("exported", exported);
      sp.set("limit", "100");

      const r = await fetch(`/api/leads-valorador?${sp.toString()}`, {
        cache: "no-store",
      });
      const j = await r.json().catch(() => ({}));

      if (!r.ok || !j?.ok) throw new Error(j?.error || "Error cargando leads");

      setRows(j.data || []);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const count = useMemo(() => rows.length, [rows]);

  async function exportOne(id: string) {
    try {
      const r = await fetch("/api/leads-valorador/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const j = await r.json().catch(() => ({}));

      if (!r.ok || !j?.ok) throw new Error(j?.error || "Error exportando");

      await load();
    } catch (e: any) {
      alert(String(e?.message || e));
    }
  }

  return (
    <main className="p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Leads Valorador</h1>
          <p className="text-sm text-slate-600">{loading ? "Cargando…" : `${count} lead(s)`}</p>
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <input
            className="w-full md:w-80 rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="Buscar (nombre, teléfono, email, ciudad, dirección)…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={exported}
            onChange={(e) => setExported(e.target.value as any)}
          >
            <option value="no">No exportados</option>
            <option value="yes">Exportados</option>
            <option value="">Todos</option>
          </select>
          <button
            onClick={load}
            className="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-semibold"
          >
            Buscar
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-4 py-3">Fecha</th>
              <th className="text-left px-4 py-3">Nombre</th>
              <th className="text-left px-4 py-3">Teléfono</th>
              <th className="text-left px-4 py-3">Ciudad</th>
              <th className="text-left px-4 py-3">Dirección</th>
              <th className="text-left px-4 py-3">Rango</th>
              <th className="text-left px-4 py-3">Estado</th>
              <th className="text-right px-4 py-3">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => {
              const created = r.created_at ? new Date(r.created_at).toLocaleString("es-ES") : "—";
              const wa = r.phone ? `https://wa.me/${String(r.phone).replace(/\D/g, "")}` : null;

              return (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 whitespace-nowrap">{created}</td>
                  <td className="px-4 py-3 font-medium">{r.name ?? "—"}</td>
                  <td className="px-4 py-3">{r.phone ?? "—"}</td>
                  <td className="px-4 py-3">{r.city ?? "—"}</td>
                  <td className="px-4 py-3 max-w-[420px] truncate">{r.address ?? "—"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {fmtEUR(r.result_min)} – {fmtEUR(r.result_max)}
                  </td>
                  <td className="px-4 py-3">
                    {r.exported_at ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-800 px-2 py-0.5 text-xs font-semibold border border-emerald-200">
                        Exportado
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-amber-50 text-amber-800 px-2 py-0.5 text-xs font-semibold border border-amber-200">
                        Pendiente
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-2">
                      {wa && (
                        <a
                          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50"
                          href={wa}
                          target="_blank"
                        >
                          WhatsApp
                        </a>
                      )}

                      {!r.exported_at ? (
                        <button
                          onClick={() => exportOne(r.id)}
                          className="rounded-xl bg-emerald-600 text-white px-3 py-2 text-xs font-semibold hover:bg-emerald-700"
                        >
                          Pasar a CRM
                        </button>
                      ) : (
                        <button
                          disabled
                          className="rounded-xl bg-slate-100 text-slate-400 px-3 py-2 text-xs font-semibold"
                        >
                          Ya exportado
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {!loading && rows.length === 0 && (
              <tr>
                <td className="px-4 py-10 text-center text-slate-500" colSpan={8}>
                  No hay leads con esos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
