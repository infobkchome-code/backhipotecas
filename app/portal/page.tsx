'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

type Cliente = {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  created_at: string;
  casos?: { id: string }[]; // relación
  case_id?: string | null;  // id del expediente principal
};

export default function PortalPage() {
  const [user, setUser] = useState<any>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');

  // 👉 Carga usuario y clientes SOLO de ese usuario
  useEffect(() => {
    const init = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        setLoading(false);
        return;
      }

      setUser(data.user);
      await loadClientes(data.user.id);
    };

    init();
  }, []);

  const loadClientes = async (userId: string) => {
    setLoading(true);

    // Traemos clientes + su caso asociado (casos)
    const { data, error } = await supabase
      .from('clientes')
      .select('id, nombre, email, telefono, created_at, casos(id)')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      const mapped: Cliente[] = data.map((c: any) => ({
        ...c,
        case_id: c.casos && c.casos.length > 0 ? c.casos[0].id : null,
      }));
      setClientes(mapped);
    }

    setLoading(false);
  };

  // 👉 Crear cliente + crear expediente (caso) asociado
  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!nombre.trim() || !email.trim()) {
      alert('Nombre y email son obligatorios');
      return;
    }

    // 1. Crear cliente
    const { data: cli, error: errCliente } = await supabase
      .from('clientes')
      .insert({
        user_id: user.id,
        nombre: nombre.trim(),
        email: email.trim(),
        telefono: telefono.trim() || null,
      })
      .select('id')
      .single();

    if (errCliente || !cli) {
      console.error(errCliente);
      alert('Error creando el cliente');
      return;
    }

    // 2. Crear expediente (caso) inicial para ese cliente
    const { error: errCaso } = await supabase
      .from('casos')
      .insert({
        user_id: user.id,
        cliente_id: cli.id,
        titulo: `Expediente ${nombre.trim()}`,
        estado: 'en_estudio',
        progreso: 0,
        notas: 'Expediente creado automáticamente.',
      });

    if (errCaso) {
      console.error(errCaso);
      alert('Cliente creado, pero hubo un problema creando el expediente.');
    }

    // 3. Recargar lista
    setNombre('');
    setEmail('');
    setTelefono('');
    await loadClientes(user.id);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

  if (loading && !user) {
    return <div className="p-6 text-gray-200">Cargando…</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-gray-100">
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-8 max-w-md w-full text-center space-y-4">
          <h1 className="text-xl font-semibold">Necesitas iniciar sesión</h1>
          <p className="text-sm text-gray-400">
            Accede desde el enlace de confirmación que te hemos enviado por correo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-emerald-400">
            Panel interno · BKC Hipotecas
          </div>
          <h1 className="text-xl font-semibold">Clientes de hipoteca</h1>
          <p className="text-xs text-gray-400">
            Desde aquí ves todos los clientes y accedes a su expediente.
          </p>
        </div>
        <div className="text-xs text-gray-400">
          Sesión: <span className="font-mono">{user.email}</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Formulario nuevo cliente */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-100">Nuevo cliente</h2>
          <form
            onSubmit={handleCreateClient}
            className="flex flex-col md:flex-row gap-3"
          >
            <input
              className="flex-1 rounded-lg bg-gray-950 border border-gray-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              placeholder="Nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
            <input
              className="flex-1 rounded-lg bg-gray-950 border border-gray-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="flex-1 rounded-lg bg-gray-950 border border-gray-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              placeholder="Teléfono"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-sm font-semibold text-gray-900"
            >
              Guardar cliente
            </button>
          </form>
          <p className="text-xs text-gray-500">
            Más adelante podremos importar clientes desde Excel o desde tu CRM.
          </p>
        </section>

        {/* Tabla de clientes */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between text-xs text-gray-400">
            <span>Listado de clientes</span>
            <span>
              {clientes.length} registro{clientes.length !== 1 && 's'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-900/60">
                <tr className="text-left text-xs text-gray-400 uppercase">
                  <th className="px-4 py-2">Nombre</th>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Teléfono</th>
                  <th className="px-4 py-2">Alta</th>
                  <th className="px-4 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clientes.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-6 text-center text-xs text-gray-500"
                    >
                      Todavía no hay clientes. Crea el primero con el formulario de arriba.
                    </td>
                  </tr>
                )}

                {clientes.map((c) => (
                  <tr
                    key={c.id}
                    className="border-t border-gray-800 hover:bg-gray-800/40"
                  >
                    <td className="px-4 py-2">{c.nombre}</td>
                    <td className="px-4 py-2 text-gray-300">{c.email}</td>
                    <td className="px-4 py-2 text-gray-300">
                      {c.telefono || '—'}
                    </td>
                    <td className="px-4 py-2 text-gray-300">
                      {formatDate(c.created_at)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {c.case_id ? (
                        <Link
                          href={`/portal/case/${c.case_id}`}
                          className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800 hover:bg-gray-700 text-emerald-300"
                        >
                          Ver expediente →
                        </Link>
                      ) : (
                        <span className="text-xs text-gray-500">
                          Sin expediente
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
