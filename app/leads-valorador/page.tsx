"use client";

import { useEffect, useMemo, useState } from "react";

type Lead = {
  id: string;
  created_at: string;
  source: string | null;
  status: string | null;
  processed_at: string | null;
  processed_note: string | null;

  name: string | null;
  phone: string | null;
  email: string | null;

  address: string | null;
  city: string | null;
  type: string | null;
  size_m2: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  has_garage: boolean | null;
  has_terrace: boolean | null;
  condition: string | null;

  result_min: number | null;
  result_max: number | null;
  lat: number | null;
  lon: number | null;

  utm: any;
  property: any;
  contact: any;
  result: any;

  ip: string | null;
  user_agent: string | null;
};

function fmtDate(s: string) {
  try {
    return new Date(s).toLocaleString("es-ES");
  } catch {
    return s;
  }
}

function fmtEUR(n: number | null) {
  if (n == null) return "-";
  return n.toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

export default function LeadsValoradorPage() {
  const [items, setItems] = useState<Lead[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const [status, setStatus] = useState<string>("new");
  const [q, setQ] = useState("");
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      sp.set("limit", String(limit));
      sp.set("offset", String(offset));
      if (status) sp.set("status", status);
      if (q.trim()) sp.set("q", q.trim());

      const res = await fetch(`/api/valorador/leads?${sp.toString()}`, { cache: "no-store" });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || "Error");
      setItems(json.data || []);
      setCount(json.count || 0);
    } catch (e) {
      console.error(e);
      setItems([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, offset]);

  const pages = useMemo(() => Math.max(1, Math.ceil(count / limit)), [count]);
  const page = useMemo(() => Math.floor(offset / limit) + 1, [offset]);

  async function setLeadStatus(id: string, nextStatus: string) {
    const note = nextStatus === "discarded" ? prompt("Motivo (opcional):") : null;

    await fetch("/api/valorador/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: nextStatus, note }),
    }).catch(() => null);

    await load();
  }

  return (
    <main className="p-6 space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Leads Valorador</h1>
          <p className="text-sm text-slate-500">
            Captados desde BKCHOME · gestión rápida (contactado / descartado) · luego los convertimos a lead CRM.
          </p>
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <select
            className="border rounded-xl px-3 py-2 text-sm bg-white"
            value={status}
            onChange={(e) => {
              setOffset(0);
              setStatus(e.target.value);
            }}
          >
            <option value="">Todos</option>
            <option value="new">Nuevos</option>
            <option value="contacted">Contactados</option>
            <option value="discarded">Descartados</option>
          </select>

          <input
            className="border rounded-xl px-3 py-2 text-sm bg-white w-64"
            placeholder="Buscar (nombre/teléfono/email/ciudad)…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setOffset(0);
                load();
              }
            }}
          />

          <button
            className="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-semibold"
            onClick={() => {
              setOffset(0);
              load();
            }}
            disabled={loading}
          >
            {loading ? "Cargando…" : "Buscar"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border bg-white overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="text-sm text-slate-600">
            Total: <span className="font-semibold text-slate-900">{count}</span> · Página{" "}
            <span className="font-semibold text-slate-900">{page}</span>/<span className="font-semibold text-slate-900">{pages}</span>
          </div>
          <div className="flex gap-2">
            <button
              className="border rounded-xl px-3 py-1.5 text-sm bg-white disabled:opacity-50"
              disabled={offset <= 0}
              onClick={() => setOffset(Math.max(0, offset - limit))}
            >
              ←
            </button>
            <button
              className="border rounded-xl px-3 py-1.5 text-sm bg-white disabled:opacity-50"
              disabled={offset + limit >= count}
              onClick={() => setOffset(offset + limit)}
            >
              →
            </button>
          </div>
        </div>

        <div className="divide-y">
          {items.length === 0 && (
            <div className="p-6 text-sm text-slate-500">
              {loading ? "Cargando…" : "No hay leads con ese filtro."}
            </div>
          )}

          {items.map((l) => {
            const shownName = l.name || l.contact?.name || "-";
            const shownPhone = l.phone || l.contact?.phone || "-";
            const shownEmail = l.email || l.contact?.email || "-";
            const shownCity = l.city || l.property?.city || "-";
            const shownAddress = l.address || l.property?.address || "-";

            const isOpen = expandedId === l.id;

            return (
              <div key={l.id} className="p-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="space-y-1">
                    <div className="text-sm text-slate-500">{fmtDate(l.created_at)} · {l.source || "bkchome_valorador"}</div>
                    <div className="text-base font-semibold text-slate-900">
                      {shownName} · <span className="font-normal">{shownPhone}</span>
                    </div>
                    <div className="text-sm text-slate-600">{shownEmail}</div>
                    <div className="text-sm text-slate-600">
                      {shownCity} · <span className="text-slate-500">{shownAddress}</span>
                    </div>
                    <div className="text-sm text-slate-700">
                      Rango: <span className="font-semibold">{fmtEUR(l.result_min ?? l.result?.minPrice ?? null)}</span>{" "}
                      — <span className="font-semibold">{fmtEUR(l.result_max ?? l.result?.maxPrice ?? null)}</span>
                    </div>

                    <div className="text-xs text-slate-500">
                      Estado: <span className="font-semibold text-slate-800">{l.status || "new"}</span>
                      {l.processed_at ? ` · ${fmtDate(l.processed_at)}` : ""}
                      {l.processed_note ? ` · Nota: ${l.processed_note}` : ""}
                    </div>
                  </div>

                  <div className="flex gap-2 items-center">
                    <a
                      className="border rounded-xl px-3 py-2 text-sm bg-white"
                      href={`https://wa.me/34${String(shownPhone).replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      WhatsApp
                    </a>

                    <button
                      className="border rounded-xl px-3 py-2 text-sm bg-white"
                      onClick={() => setExpandedId(isOpen ? null : l.id)}
                    >
                      {isOpen ? "Ocultar" : "Ver detalle"}
                    </button>

                    <button
                      className="rounded-xl bg-emerald-600 text-white px-3 py-2 text-sm font-semibold"
                      onClick={() => setLeadStatus(l.id, "contacted")}
                    >
                      Contactado
                    </button>

                    <button
                      className="rounded-xl bg-slate-800 text-white px-3 py-2 text-sm font-semibold"
                      onClick={() => setLeadStatus(l.id, "discarded")}
                    >
                      Descartar
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl border bg-slate-50 p-3">
                      <div className="text-xs font-semibold text-slate-700 mb-2">property (raw)</div>
                      <pre className="text-[11px] whitespace-pre-wrap break-words">{JSON.stringify(l.property, null, 2)}</pre>
                    </div>
                    <div className="rounded-xl border bg-slate-50 p-3">
                      <div className="text-xs font-semibold text-slate-700 mb-2">contact (raw)</div>
                      <pre className="text-[11px] whitespace-pre-wrap break-words">{JSON.stringify(l.contact, null, 2)}</pre>
                    </div>
                    <div className="rounded-xl border bg-slate-50 p-3 md:col-span-2">
                      <div className="text-xs font-semibold text-slate-700 mb-2">utm / extra</div>
                      <pre className="text-[11px] whitespace-pre-wrap break-words">{JSON.stringify(l.utm, null, 2)}</pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
