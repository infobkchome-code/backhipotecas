"use client";

import { useEffect, useState } from "react";

type Config = {
  conditions: Record<string, number>;
  modifiers: { garage: number; terrace: number };
  range: { min: number; max: number };
};

const DEFAULT: Config = {
  conditions: { reformar: 1400, buen_estado: 1800, reformado: 2100, obra_nueva: 2300 },
  modifiers: { garage: 0.05, terrace: 0.05 },
  range: { min: 0.93, max: 1.05 },
};

export default function ValoradorPreciosAdmin() {
  const [config, setConfig] = useState<Config>(DEFAULT);
  const [token, setToken] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("VALORADOR_ADMIN_TOKEN") || "";
    setToken(saved);

    (async () => {
      try {
        const r = await fetch("/api/valorador/config");
        const j = await r.json();
        if (j?.data) setConfig(j.data);
      } catch {}
      setLoading(false);
    })();
  }, []);

  async function save() {
    setMsg(null);
    localStorage.setItem("VALORADOR_ADMIN_TOKEN", token);

    const r = await fetch("/api/valorador/config", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ config }),
    });

    const j = await r.json();
    setMsg(j?.ok ? "✅ Guardado" : `❌ Error: ${j?.error || "desconocido"}`);
  }

  if (loading) return <div className="p-6">Cargando…</div>;

  const input =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-emerald-100";

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-xl font-semibold">Admin · Precios Valorador (€/m²)</h1>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
        <label className="text-xs font-semibold text-slate-600">Token admin (solo tú)</label>
        <input className={input} value={token} onChange={(e) => setToken(e.target.value)} placeholder="VALORADOR_ADMIN_TOKEN" />
        <p className="text-xs text-slate-500">Se guarda en tu navegador (localStorage).</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
        <div className="font-semibold">Precios por estado</div>

        {Object.entries(config.conditions).map(([k, v]) => (
          <div key={k} className="grid grid-cols-2 gap-3 items-center">
            <div className="text-sm text-slate-700">{k}</div>
            <input
              className={input}
              type="number"
              value={v}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  conditions: { ...c.conditions, [k]: Number(e.target.value) },
                }))
              }
            />
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
        <div className="font-semibold">Modificadores</div>

        <div className="grid grid-cols-2 gap-3 items-center">
          <div className="text-sm text-slate-700">Garaje (+)</div>
          <input
            className={input}
            type="number"
            step="0.01"
            value={config.modifiers.garage}
            onChange={(e) => setConfig((c) => ({ ...c, modifiers: { ...c.modifiers, garage: Number(e.target.value) } }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 items-center">
          <div className="text-sm text-slate-700">Terraza (+)</div>
          <input
            className={input}
            type="number"
            step="0.01"
            value={config.modifiers.terrace}
            onChange={(e) => setConfig((c) => ({ ...c, modifiers: { ...c.modifiers, terrace: Number(e.target.value) } }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 items-center">
          <div className="text-sm text-slate-700">Rango mín (x)</div>
          <input
            className={input}
            type="number"
            step="0.01"
            value={config.range.min}
            onChange={(e) => setConfig((c) => ({ ...c, range: { ...c.range, min: Number(e.target.value) } }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 items-center">
          <div className="text-sm text-slate-700">Rango máx (x)</div>
          <input
            className={input}
            type="number"
            step="0.01"
            value={config.range.max}
            onChange={(e) => setConfig((c) => ({ ...c, range: { ...c.range, max: Number(e.target.value) } }))}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          className="rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Guardar
        </button>
        {msg && <div className="text-sm">{msg}</div>}
      </div>
    </div>
  );
}
