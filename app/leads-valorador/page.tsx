"use client";

import { useEffect, useMemo, useState } from "react";

type Lead = any;

function fmtDate(s?: string) {
  if (!s) return "-";
  try { return new Date(s).toLocaleString("es-ES"); } catch { return s; }
}
function fmtDateOnly(s?: string) {
  if (!s) return "-";
  try { return new Date(s).toLocaleDateString("es-ES"); } catch { return s; }
}
function fmtEUR(n: number | null | undefined) {
  if (n == null) return "-";
  return Number(n).toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

function completeness(l: Lead) {
  const name = l.name ?? l.contact?.name;
  const phone = l.phone ?? l.contact?.phone;
  const email = l.email ?? l.contact?.email;
  const address = l.address ?? l.property?.address;
  const city = l.city ?? l.property?.city;
  const size = l.size_m2 ?? l.property?.size;
  const type = l.type ?? l.property?.type;

  const fields = [name, phone, email, address, city, size, type];
  const filled = fields.filter(Boolean).length;
  const total = fields.length;
  return { filled, total, incomplete: filled < total };
}

function priorityRank(p?: string) {
  const x = (p || "baja").toLowerCase();
  if (x === "critica") return 4;
  if (x === "alta") return 3;
  if (x === "media") return 2;
  return 1;
}

export default function LeadsValoradorPage() {
  const [items, setItems] = useState<Lead[]>([]);
  const [count, setCount] = useState(0);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(false);

  // filtros estilo “Expedientes”
  const [status, setStatus] = useState("new");
  const [q, setQ] = useState("");
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [incompleteOnly, setIncompleteOnly] = useState(false);
  const [sort, setSort] = useState<"latest" | "lessdata" | "priority">("latest");

  const [offset, setOffset] = useState(0);
  const limit = 25;

  const [openId, setOpenId] = useState<string | null>(null);
  const openLead = useMemo(() => items.find((x) => x.id === openId) || null, [items, openId]);

  async function load() {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      sp.set("limit", String(limit));
      sp.set("offset", String(offset));
      if (status) sp.set("status", status);
      if (q.trim()) sp.set("q", q.trim());
      if (urgentOnly) sp.set("urgent", "1");
      if (overdueOnly) sp.set("overdue", "1");
      sp.set("sort", sort);

      const r = await fetch(`/api/valorador/leads?${sp.toString()}`, { cache: "no-store" });
      const j = await r.json();
      if (!j?.ok) throw new Error(j?.error || "Error");
      setItems(j.data || []);
      setCount(j.count || 0);
      setSummary(j.summary || {});
    } catch (e) {
      console.error(e);
      setItems([]);
      setCount(0);
      setSummary({});
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status, offset, urgentOnly, overdueOnly, sort]);

  const computed = useMemo(() => {
    let arr = [...items];

    if (incompleteOnly) {
      arr = arr.filter((l) => completeness(l).incomplete);
    }

    if (sort === "lessdata") {
      arr.sort((a, b) => completeness(a).filled - completeness(b).filled);
    }
    if (sort === "priority") {
      arr.sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority));
    }

    const incompleteCount = (items || []).filter((l) => completeness(l).incomplete).length;
    return { arr, incompleteCount };
  }, [items, incompleteOnly, sort]);

  async function patchLead(id: string, patch: any) {
    await fetch("/api/valorador/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    }).catch(() => null);
    await load();
  }

  async function convertLead(id: string) {
    await fetch("/api/valorador/convert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => null);
    await load();
  }

  const pages = Math.max(1, Math.ceil(count / limit));
  const page = Math.floor(offset / limit) + 1;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        <div>
          <div className="text-xs font-semibold tracking-[0.18em] uppercase text-slate-500">
            Panel de gestión
          </div>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Leads Valorador</h1>
          <p className="mt-1 text-sm text-slate-600">
            Visualiza y prioriza los leads captados desde BKCHOME.
          </p>
        </div>

        {/* Cards estilo Expedientes */}
        <div className="grid gap-3 md:grid-cols-4">
          <button onClick={() => { setOffset(0); setStatus("new"); }} className="text-left rounded-2xl border bg-white p-4 hover:bg-slate-50">
            <div className="text-xs text-slate-500">Nuevos</div>
            <div className="mt-1 text-2xl font-semibold">{summary.new ?? "-"}</div>
          </button>

          <button onClick={() => { setOffset(0); setStatus("contacted"); }} className="text-left rounded-2xl border bg-white p-4 hover:bg-slate-50">
            <div className="text-xs text-slate-500">Contactados</div>
            <div className="mt-1 text-2xl font-semibold">{summary.contacted ?? "-"}</div>
          </button>

          <button onClick={() => { setOffset(0); setStatus("converted"); }} className="text-left rounded-2xl border bg-white p-4 hover:bg-slate-50">
            <div className="text-xs text-slate-500">Convertidos</div>
            <div className="mt-1 text-2xl font-semibold">{summary.converted ?? "-"}</div>
          </button>

          <button onClick={() => { setOffset(0); setStatus("discarded"); }} className="text-left rounded-2xl border bg-white p-4 hover:bg-slate-50">
            <div className="text-xs text-slate-500">Descartados</div>
            <div className="mt-1 text-2xl font-semibold">{summary.discarded ?? "-"}</div>
          </button>

          <button onClick={() => setUrgentOnly((v) => !v)} className="text-left rounded-2xl border bg-white p-4 hover:bg-slate-50">
            <div className="text-xs text-slate-500">Urgentes</div>
            <div className="mt-1 text-2xl font-semibold text-rose-600">{summary.urgent ?? "-"}</div>
          </button>

          <button onClick={() => setOverdueOnly((v) => !v)} className="text-left rounded-2xl border bg-white p-4 hover:bg-slate-50">
            <div className="text-xs text-slate-500">Vencidos</div>
            <div className="mt-1 text-2xl font-semibold text-amber-600">{summary.overdue ?? "-"}</div>
          </button>

          <button onClick={() => setIncompleteOnly((v) => !v)} className="text-left rounded-2xl border bg-white p-4 hover:bg-slate-50">
            <div className="text-xs text-slate-500">Datos incompletos</div>
            <div className="mt-1 text-2xl font-semibold text-slate-800">{computed.incompleteCount}</div>
          </button>

          <div className="rounded-2xl border bg-white p-4">
            <div className="text-xs text-slate-500">Página</div>
            <div className="mt-1 text-2xl font-semibold">{page}/{pages}</div>
          </div>
        </div>

        {/* Caja filtros + búsqueda (como Expedientes) */}
        <div className="rounded-2xl border bg-white p-4 space-y-3">
          <input
            className="w-full rounded-xl border px-4 py-2.5 text-sm"
            placeholder="Buscar por nombre, teléfono, email, ciudad, dirección…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { setOffset(0); load(); }
            }}
          />

          <div className="flex gap-2 flex-wrap items-center">
            <select
              className="rounded-xl border px-3 py-2 text-sm bg-white"
              value={status}
              onChange={(e) => { setOffset(0); setStatus(e.target.value); }}
            >
              <option value="new">Nuevos</option>
              <option value="contacted">Contactados</option>
              <option value="converted">Convertidos</option>
              <option value="discarded">Descartados</option>
              <option value="">Todos</option>
            </select>

            <button onClick={() => setUrgentOnly((v) => !v)} className={`rounded-xl border px-3 py-2 text-sm ${urgentOnly ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-white"}`}>
              Urgentes
            </button>

            <button onClick={() => setOverdueOnly((v) => !v)} className={`rounded-xl border px-3 py-2 text-sm ${overdueOnly ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-white"}`}>
              Vencidos
            </button>

            <button onClick={() => setIncompleteOnly((v) => !v)} className={`rounded-xl border px-3 py-2 text-sm ${incompleteOnly ? "bg-slate-100 border-slate-200" : "bg-white"}`}>
              Datos pendientes
            </button>

            <button onClick={() => setSort("latest")} className={`rounded-xl border px-3 py-2 text-sm ${sort === "latest" ? "bg-slate-900 text-white border-slate-900" : "bg-white"}`}>
              Últimos mov.
            </button>
            <button onClick={() => setSort("lessdata")} className={`rounded-xl border px-3 py-2 text-sm ${sort === "lessdata" ? "bg-slate-900 text-white border-slate-900" : "bg-white"}`}>
              Menos datos
            </button>
            <button onClick={() => setSort("priority")} className={`rounded-xl border px-3 py-2 text-sm ${sort === "priority" ? "bg-slate-900 text-white border-slate-900" : "bg-white"}`}>
              Prioridad
            </button>

            <button
              onClick={() => {
                setQ("");
                setUrgentOnly(false);
                setOverdueOnly(false);
                setIncompleteOnly(false);
                setSort("latest");
                setStatus("new");
                setOffset(0);
                load();
              }}
              className="rounded-xl border px-3 py-2 text-sm bg-white"
            >
              Limpiar filtros
            </button>

            <button
              onClick={() => { setOffset(0); load(); }}
              className="ml-auto rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-semibold"
              disabled={loading}
            >
              {loading ? "Cargando…" : "Buscar"}
            </button>
          </div>
        </div>

        {/* Tabla estilo Expedientes */}
        <div className="rounded-2xl border bg-white overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div className="text-sm text-slate-600">
              Total: <span className="font-semibold text-slate-900">{count}</span>
            </div>
            <div className="flex gap-2">
              <button className="rounded-xl border px-3 py-1.5 text-sm disabled:opacity-50" disabled={offset <= 0} onClick={() => setOffset(Math.max(0, offset - limit))}>←</button>
              <button className="rounded-xl border px-3 py-1.5 text-sm disabled:opacity-50" disabled={offset + limit >= count} onClick={() => setOffset(offset + limit)}>→</button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr className="text-left">
                  <th className="px-4 py-3 font-medium">Lead</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Urgente</th>
                  <th className="px-4 py-3 font-medium">Fecha límite</th>
                  <th className="px-4 py-3 font-medium">Prioridad</th>
                  <th className="px-4 py-3 font-medium">Datos</th>
                  <th className="px-4 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {computed.arr.map((l) => {
                  const name = l.name ?? l.contact?.name ?? "—";
                  const phone = l.phone ?? l.contact?.phone ?? "—";
                  const city = l.city ?? l.property?.city ?? "—";
                  const last = fmtDate(l.created_at);

                  const comp = completeness(l);
                  const pct = Math.round((comp.filled / comp.total) * 100);

                  const min = l.result_min ?? l.result?.minPrice ?? null;
                  const max = l.result_max ?? l.result?.maxPrice ?? null;

                  const overdue = l.due_date ? (String(l.due_date) < new Date().toISOString().slice(0, 10)) : false;

                  return (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{name}</div>
                        <div className="text-xs text-slate-500">Último mov.: {last}</div>
                        <div className="text-xs text-slate-600">{city} · {phone}</div>
                        <div className="text-xs text-slate-600">Rango: <span className="font-semibold">{fmtEUR(min)}</span> — <span className="font-semibold">{fmtEUR(max)}</span></div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold bg-white">
                          {l.status || "new"}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        {l.urgent ? (
                          <span className="inline-flex items-center rounded-full bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 text-xs font-semibold">¡Urgente!</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {l.due_date ? (
                          <span className={`text-xs font-semibold ${overdue ? "text-rose-600" : "text-slate-700"}`}>
                            {fmtDateOnly(l.due_date)}{overdue ? " (Vencido)" : ""}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold bg-white">
                          {(l.priority || "baja").toLowerCase()}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-28 h-2 rounded-full bg-slate-200 overflow-hidden">
                            <div className="h-full bg-amber-500" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs font-semibold text-slate-700">
                            {comp.filled}/{comp.total}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2 flex-wrap">
                          <button
                            onClick={() => setOpenId(l.id)}
                            className="rounded-xl border px-3 py-1.5 text-xs font-semibold bg-white"
                          >
                            Abrir
                          </button>

                          <button
                            onClick={() => patchLead(l.id, { urgent: !l.urgent })}
                            className="rounded-xl border px-3 py-1.5 text-xs font-semibold bg-white"
                          >
                            {l.urgent ? "Quitar urgente" : "Urgente"}
                          </button>

                          <button
                            onClick={() => patchLead(l.id, { status: "contacted" })}
                            className="rounded-xl border px-3 py-1.5 text-xs font-semibold bg-white"
                          >
                            Contactado
                          </button>

                          <button
                            onClick={() => convertLead(l.id)}
                            className="rounded-xl bg-emerald-600 text-white px-3 py-1.5 text-xs font-semibold"
                          >
                            Pasar al CRM
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {computed.arr.length === 0 && (
                  <tr>
                    <td className="px-4 py-8 text-slate-500" colSpan={7}>
                      {loading ? "Cargando…" : "No hay leads con esos filtros."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Drawer simple */}
        {openLead && (
          <div className="fixed inset-0 bg-black/30 flex justify-end z-50">
            <div className="w-full max-w-xl h-full bg-white shadow-xl p-5 overflow-y-auto">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-slate-500">Lead</div>
                  <div className="text-lg font-semibold">
                    {openLead.name ?? openLead.contact?.name ?? "—"}
                  </div>
                  <div className="text-sm text-slate-600">
                    {openLead.phone ?? openLead.contact?.phone ?? "—"} · {openLead.email ?? openLead.contact?.email ?? "—"}
                  </div>
                </div>
                <button className="rounded-xl border px-3 py-1.5 text-sm" onClick={() => setOpenId(null)}>
                  Cerrar
                </button>
              </div>

              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl border p-3">
                  <div className="text-xs font-semibold text-slate-700 mb-2">Acciones rápidas</div>

                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => patchLead(openLead.id, { status: "new" })} className="rounded-xl border px-3 py-2 text-sm">Nuevo</button>
                    <button onClick={() => patchLead(openLead.id, { status: "contacted" })} className="rounded-xl border px-3 py-2 text-sm">Contactado</button>
                    <button onClick={() => patchLead(openLead.id, { status: "discarded", note: prompt("Motivo (opcional):") || null })} className="rounded-xl border px-3 py-2 text-sm">Descartar</button>

                    <button onClick={() => patchLead(openLead.id, { priority: "baja" })} className="rounded-xl border px-3 py-2 text-sm">Baja</button>
                    <button onClick={() => patchLead(openLead.id, { priority: "media" })} className="rounded-xl border px-3 py-2 text-sm">Media</button>
                    <button onClick={() => patchLead(openLead.id, { priority: "alta" })} className="rounded-xl border px-3 py-2 text-sm">Alta</button>
                    <button onClick={() => patchLead(openLead.id, { priority: "critica" })} className="rounded-xl border px-3 py-2 text-sm">Crítica</button>

                    <button onClick={() => patchLead(openLead.id, { urgent: !openLead.urgent })} className="rounded-xl border px-3 py-2 text-sm">
                      {openLead.urgent ? "Quitar urgente" : "Marcar urgente"}
                    </button>

                    <button
                      onClick={() => {
                        const d = prompt("Fecha límite (YYYY-MM-DD) o vacío para borrar:", openLead.due_date || "");
                        patchLead(openLead.id, { due_date: d || null });
                      }}
                      className="rounded-xl border px-3 py-2 text-sm"
                    >
                      Fecha límite
                    </button>

                    <button onClick={() => convertLead(openLead.id)} className="rounded-xl bg-emerald-600 text-white px-3 py-2 text-sm font-semibold">
                      Pasar al CRM
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border p-3 bg-slate-50">
                  <div className="text-xs font-semibold text-slate-700 mb-2">Raw (leads_valorador)</div>
                  <pre className="text-[11px] whitespace-pre-wrap break-words">{JSON.stringify(openLead, null, 2)}</pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
