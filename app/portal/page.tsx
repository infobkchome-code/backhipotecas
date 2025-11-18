'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type CaseItem = {
  id: string;
  dni?: string | null;
  telefono?: string | null;
  email?: string | null;
  estado?: string | null;
  created_at?: string | null;
  seguimiento_token?: string | null;
  [key: string]: any; // para el resto de columnas que vengan de Supabase
};

type ApiResponse = {
  data?: CaseItem[];
  cases?: CaseItem[];
  casos?: CaseItem[];
};

// Detecta automáticamente la columna de nombre
function getNombre(item: CaseItem): string {
  const keys = Object.keys(item);
  // buscamos una key que contenga "nombre" o "name"
  const nameKey = keys.find((k) =>
    /nombre|name/i.test(k)
  );

  if (!nameKey) return '';

  const val = item[nameKey];
  return val == null ? '' : String(val).trim();
}

export default function PortalPage() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const loadCases = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch('/api/portal/cases/list', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        });

        if (!res.ok) {
          throw new Error(`Error al cargar los expedientes (${res.status})`);
        }

        const json: ApiResponse | CaseItem[] = await res.json();

        let loaded: CaseItem[] = [];
        if (Array.isArray(json)) {
          loaded = json;
        } else if (json.data) {
          loaded = json.data;
        } else if (json.cases) {
          loaded = json.cases;
        } else if (json.casos) {
          loaded = json.casos;
        }

        setCases(loaded);
      } catch (err: any) {
        console.error(err);
        setError(err.message ?? 'Error inesperado al cargar los expedientes');
      } finally {
        setLoading(false);
      }
    };

    loadCases();
  }, []);

  const filteredCases = useMemo(() => {
    if (!search.trim()) return cases;

    const term = search.toLowerCase();

    return cases.filter((item) => {
      const nombre = getNombre(item).toLowerCase();
      const dni = (item.dni ?? '').toString().toLowerCase();
      const tel = (item.telefono ?? '').toString().toLowerCase();
      const email = (item.email ?? '').toString().toLowerCase();
      const estado = (item.estado ?? '').toString().toLowerCase();

      return (
        nombre.includes(term) ||
        dni.includes(term) ||
        tel.includes(term) ||
        email.includes(term) ||
        estado.includes(term)
      );
    });
  }, [cases, search]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              BKC Hipotecas · Portal de expedientes
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Revisa y accede a los expedientes de tus clientes. Usa el buscador para
              filtrar por nombre, DNI, teléfono, email o estado.
            </p>
          </div>

          <Link
            href="/portal/clients/new"
            className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700"
          >
            + Nuevo expediente
          </Link>
        </header>

        <div className="mb-4">
          <div className="relative max-w-md">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, DNI, teléfono, email o estado..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pr-10 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
              🔍
            </span>
          </div>
        </div>

        {loading && (
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
            Cargando expedientes...
          </div>
        )}

        {error && !loading && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && filteredCases.length === 0 && (
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
            No se han encontrado expedientes con ese filtro.
          </div>
        )}

        {!loading && !error && filteredCases.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-slate-100">
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">DNI</th>
                  <th className="px-4 py-3">Teléfono</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Creado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCases.map((item) => {
                  const fecha =
                    item.created_at
                      ? new Date(item.created_at).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })
                      : '-';

                  const nombreMostrar = getNombre(item) || `Expediente ${item.id}`;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">
                          {nombreMostrar}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {item.dni || '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {item.telefono || '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {item.email || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                          {item.estado || 'Sin estado'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{fecha}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/portal/case/${item.id}`}
                            className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-100"
                          >
                            Ver expediente
                          </Link>

                          {item.seguimiento_token ? (
                            <Link
                              href={`/seguimiento/${item.seguimiento_token}`}
                              className="inline-flex items-center rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-emerald-700"
                              target="_blank"
                            >
                              Ver como cliente
                            </Link>
                          ) : (
                            <button
                              type="button"
                              className="inline-flex cursor-not-allowed items-center rounded-md bg-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-500"
                              title="Este expediente aún no tiene enlace de seguimiento"
                              disabled
                            >
                              Sin enlace
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
