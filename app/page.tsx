'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

type Caso = {
  id: string;
  titulo: string | null;
  estado: string | null;
  progreso: number | null;
  notas: string | null;
  created_at: string;
};

type ClienteRow = {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  created_at: string;
  casos: Caso[]; // relación 1-N, aunque en la práctica usaremos el primero
};

type ClienteUI = {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  alta: string;
  caso?: Caso;
};

type FiltroEstado = 'todos' | 'en_estudio' | 'cerrado';

export default function PortalPage() {
  const [clientes, setClientes] = useState<ClienteUI[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todos');
  const [search, setSearch] = useState('');

  // 🔁 Cargar clientes + casos desde Supabase
  const loadClients = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);

    // 1) Usuario autenticado
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error(userError ?? 'Usuario no autenticado');
      setErrorMsg('Debes iniciar sesión para ver los clientes.');
      setClientes([]);
      setLoading(false);
      return;
    }

    // 2) Pedimos clientes + sus casos
    const { data, error } = await supabase
      .from('clientes')
      .select(
        `
        id,
        nombre,
        email,
        telefono,
        created_at,
        casos (
          id,
          titulo,
          estado,
          progreso,
          notas,
          created_at
        )
      `,
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error cargando clientes:', error);
      setErrorMsg('No se han podido cargar los clientes.');
      setClientes([]);
      setLoading(false);
      return;
    }

    // 3) Normalizamos datos para el frontend
    const mapped: ClienteUI[] = (data as ClienteRow[]).map((c) => ({
      id: c.id,
      nombre: c.nombre,
      email: c.email,
      telefono: c.telefono,
      alta: new Date(c.created_at).toLocaleDateString('es-ES'),
      caso: c.casos?.[0], // usamos el primer expediente (1 por cliente)
    }));

    setClientes(mapped);
    setLoading(false);
  }, []);

  // ▶ Carga inicial
  useEffect(() => {
    loadClients();
  }, [loadClients]);

  // 🚿 Botón "Refrescar"
  const handleRefresh = () => {
    if (!loading) {
      loadClients();
    }
  };

  // 🧮 Aplicamos filtros en memoria
  const clientesFiltrados = clientes.filter((c) => {
    // filtro por estado
    if (filtroEstado !== 'todos') {
      const estado = c.caso?.estado ?? '';
      if (filtroEstado === 'en_estudio' && estado !== 'en_estudio') return false;
      if (filtroEstado === 'cerrado' && estado !== 'cerrado') return false;
    }

    // filtro por búsqueda
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      const matchNombre = c.nombre.toLowerCase().includes(term);
      const matchEmail = c.email.toLowerCase().includes(term);
      const matchTel = (c.telefono ?? '').toLowerCase().includes(term);
      if (!matchNombre && !matchEmail && !matchTel) return false;
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-emerald-400">
            BKC HIPOTECAS · PANEL INTERNO
          </div>
          <h1 className="text-xl font-semibold mt-1">Clientes y expedientes</h1>
          <p className="text-xs text-slate-400">
            Desde aquí ves todos tus clientes y accedes a su expediente.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="px-4 py-2 rounded-md border border-slate-700 text-sm hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Actualizando…' : 'Refrescar'}
          </button>

          <Link
            href="/portal/clients/new" // ⬅️ cambia esto si tu ruta es otra
            className="px-4 py-2 rounded-md bg-emerald-500 text-slate-950 text-sm font-medium hover:bg-emerald-400"
          >
            + Nuevo cliente
          </Link>
        </div>
      </header>

      <main className="px-6 py-4 max-w-6xl mx-auto space-y-4">
        {/* Filtros */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-slate-400">
              {clientesFiltrados.length} clientes encontrados
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFiltroEstado('todos')}
              className={`px-3 py-1 rounded-full text-xs border ${
                filtroEstado === 'todos'
                  ? 'bg-slate-100 text-slate-900'
                  : 'border-slate-600 text-slate-300 hover:bg-slate-800'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFiltroEstado('en_estudio')}
              className={`px-3 py-1 rounded-full text-xs border ${
                filtroEstado === 'en_estudio'
                  ? 'bg-slate-100 text-slate-900'
                  : 'border-slate-600 text-slate-300 hover:bg-slate-800'
              }`}
            >
              En estudio
            </button>
            <button
              onClick={() => setFiltroEstado('cerrado')}
              className={`px-3 py-1 rounded-full text-xs border ${
                filtroEstado === 'cerrado'
                  ? 'bg-slate-100 text-slate-900'
                  : 'border-slate-600 text-slate-300 hover:bg-slate-800'
              }`}
            >
              Cerrado
            </button>
          </div>

          <div className="w-full md:w-72">
            <input
              type="text"
              placeholder="Buscar por nombre, email o teléfono…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Mensaje de error si falla la carga */}
        {errorMsg && (
          <div className="w-full rounded-md bg-red-900/30 border border-red-700 text-sm text-red-200 px-4 py-2">
            {errorMsg}
          </div>
        )}

        {/* Tabla */}
        <div className="mt-2 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/40">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900/80 text-slate-400">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Cliente</th>
                <th className="px-4 py-2 text-left font-medium">Contacto</th>
                <th className="px-4 py-2 text-left font-medium">Fechas</th>
                <th className="px-4 py-2 text-left font-medium">Expediente</th>
                <th className="px-4 py-2 text-left font-medium">Progreso</th>
                <th className="px-4 py-2 text-left font-medium">Observaciones</th>
                <th className="px-4 py-2 text-left font-medium">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {!loading && clientesFiltrados.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-6 text-center text-sm text-slate-500"
                  >
                    No hay clientes con los filtros actuales.
                  </td>
                </tr>
              )}

              {clientesFiltrados.map((c) => (
                <tr
                  key={c.id}
                  className="border-t border-slate-800 hover:bg-slate-900/50"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium">{c.nombre}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    <div>{c.email}</div>
                    {c.telefono && (
                      <div className="text-xs text-slate-500">{c.telefono}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    Alta: {c.alta}
                  </td>
                  <td className="px-4 py-3">
                    {c.caso ? c.caso.titulo ?? 'Expediente' : 'Sin expediente'}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {c.caso ? `${c.caso.progreso ?? 0}%` : '-'}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {c.caso?.notas ?? ''}
                  </td>
                  <td className="px-4 py-3">
                    {c.caso && (
                      <Link
                        href={`/portal/case/${c.caso.id}`}
                        className="text-emerald-400 text-xs hover:underline"
                      >
                        Ver expediente →
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
