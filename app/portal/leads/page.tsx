"use client";

import { useEffect, useMemo, useState } from "react";

type Lead = {
  id: string;
  created_at: string;
  source: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  address: string | null;
  size_m2: number | null;
  result_min: number | null;
  result_max: number | null;
  crm_case_id: string | null;
  status: string | null;
};

function formatEUR(v: number | null) {
  if (v == null) return "—";
  return v.toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
}

export default function LeadsPage() {
  const [items, setItems] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/leads/list", { cache: "no-store" });
      const j = await r.json();
      setItems(Array.isArray(j?.data) ? j.data : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((x) =>
      [x.name, x.phone, x.email, x.city, x.address]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(s)
    );
  }, [items, q]);

  async function pasarAExpediente(id: string) {
    const r = await fetch("/api/valorador/convert-to-expediente", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const j = await r.json();
    if (j?.ok && j?.case_id) {
      window.location.href = `/portal/case/${j.case_id}`;
      return;
    }
    alert(j?.error || "No se pudo convertir el lead a expediente.");
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Leads (Valorador)</h1>
            <p className="text-sm text-slate-600">
              Entradas del valorador de BKCHOME. Desde aquí los conviertes en expediente.
            </p>
          </div>

          <div className="flex gap-2">
            <input
              className="w-full md:w-80 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm"
              placeholder="Buscar por nombre, teléfono, email, ciudad…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button
              onClick={load}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Recargar
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold text-slate-500 bg-slate-50 border-b border-slate-200">
            <div className="col-span-2">Fecha</div>
            <div className="col-span-3">Contacto</div>
            <div className="col-span-4">Vivienda</div>
            <div className="col-span-2">Rango</div>
            <div className="col-span-1 text-right">Acción</div>
          </div>

          {loading ? (
            <div className="px-4 py-8 text-sm text-slate-600">Cargando…</div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-8 text-sm text-slate-600">No hay leads.</div>
          ) : (
            filtered.map((x) => (
              <div
                key={x.id}
                className="grid grid-cols-12 gap-2 px-4 py-3 text-sm border-b border-slate-100"
              >
                <div className="col-span-2 text-slate-600">
                  {new Date(x.created_at).toLocaleString("es-ES")}
                </div>

                <div className="col-span-3">
                  <div className="font-semibold text-slate-900">{x.name || "—"}</div>
                  <div className="text-xs text-slate-600">{x.phone || "—"}</div>
                  <div className="text-xs text-slate-500">{x.email || ""}</div>
                </div>

                <div className="col-span-4">
                  <div className="text-slate-900">{x.city || "—"}</div>
                  <div className="text-xs text-slate-600 line-clamp-1">{x.address || ""}</div>
                  <div className="text-xs text-slate-500">
                    {x.size_m2 ? `${x.size_m2} m²` : "—"}
                  </div>
                </div>

                <div className="col-span-2">
                  <div className="text-slate-900">{formatEUR(x.result_min)}</div>
                  <div className="text-xs text-slate-600">{formatEUR(x.result_max)}</div>
                </div>

                <div className="col-span-1 flex justify-end">
                  {x.crm_case_id ? (
                    <a
                      className="text-xs font-semibold text-emerald-700 hover:underline"
                      href={`/portal/case/${x.crm_case_id}`}
                    >
                      Abrir
                    </a>
                  ) : (
                    <button
                      onClick={() => pasarAExpediente(x.id)}
                      className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      Pasar
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
