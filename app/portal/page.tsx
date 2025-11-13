'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

const ADMIN_EMAILS = ['nahuelbritos@icloud.com']; // ← aquí los correos que SÍ pueden ver el panel interno

type Cliente = {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  created_at: string;
};

export default function PortalPage() {
  const router = useRouter();

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null); // null = todavía cargando
  const [loading, setLoading] = useState(true);

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nombre: '',
    email: '',
    telefono: '',
  });

  // 1) Comprobamos usuario y rol (admin / no admin)
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user) {
        setUserEmail(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const email = data.user.email ?? null;
      setUserEmail(email);

      const admin = email !== null && ADMIN_EMAILS.includes(email);
      setIsAdmin(admin);

      setLoading(false);

      // Si es admin, cargamos clientes
      if (admin) {
        await loadClientes();
      }
    })();
  }, []);

  // 2) Cargar clientes del admin autenticado
  const loadClientes = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return;

    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('user_id', userData.user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setClientes(data as Cliente[]);
    }
  };

  // 3) Crear cliente nuevo (usa nuestra API /api/portal/create-client)
  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre || !form.email) return;

    setSaving(true);

    const res = await fetch('/api/portal/create-client', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: form.nombre,
        email: form.email,
        telefono: form.telefono || null,
      }),
    });

    setSaving(false);

    if (!res.ok) {
      alert('Error al crear el cliente');
      return;
    }

    setForm({ nombre: '', email: '', telefono: '' });
    await loadClientes();
  };

  // 4) Abrir expediente de un cliente
  const handleOpenCase = async (clienteId: string) => {
    // buscamos o creamos un caso por cliente
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return;

    // ¿ya hay caso?
    const { data: casos, error } = await supabase
      .from('casos')
      .select('id')
      .eq('user_id', userData.user.id)
      .eq('cliente_id', clienteId)
      .limit(1)
      .maybeSingle();

    if (!error && casos?.id) {
      router.push(`/portal/case/${casos.id}`);
      return;
    }

    // si no hay, lo creamos
    const { data: nuevo, error: createError } = await supabase
      .from('casos')
      .insert({
        user_id: userData.user.id,
        cliente_id: clienteId,
        titulo: 'Expediente hipotecario',
        estado: 'en_estudio',
        progreso: 0,
        notas: 'Expediente creado automáticamente.',
      })
      .select('id')
      .single();

    if (createError || !nuevo) {
      alert('No se pudo crear el expediente');
      return;
    }

    router.push(`/portal/case/${nuevo.id}`);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/portal/login');
  };

  // --------------- RENDER ---------------

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <div className="text-sm text-slate-300">Cargando…</div>
      </div>
    );
  }

  // No hay usuario logueado
  if (!userEmail) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
        <div className="space-y-4 text-center">
          <p className="text-sm text-slate-300">No has iniciado sesión.</p>
          <button
            onClick={() => router.push('/portal/login')}
            className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400"
          >
            Ir al login del panel interno
          </button>
        </div>
      </div>
    );
  }

  // Usuario logueado pero NO es admin → no ve panel interno
  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full space-y-4 text-center">
          <h1 className="text-xl font-semibold">Acceso solo interno</h1>
          <p className="text-sm text-slate-400">
            Este panel es solo para uso interno de BKC Hipotecas.
          </p>
          <p className="text-xs text-slate-500">
            Has iniciado sesión como <span className="font-mono">{userEmail}</span>, 
            pero este correo no está autorizado como administrador.
          </p>
          <button
            onClick={handleLogout}
            className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  // Admin autenticado → panel interno completo
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-emerald-400">
            Panel interno · BKC Hipotecas
          </div>
          <h1 className="text-xl font-semibold mt-1">Clientes de hipoteca</h1>
          <p className="text-xs text-slate-400">
            Desde aquí ves todos tus clientes y accedes a su expediente.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="font-mono text-slate-300">{userEmail}</span>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-slate-700 px-3 py-1 hover:bg-slate-800"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Formulario nuevo cliente */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-medium text-slate-100">
            Nuevo cliente
          </h2>
          <p className="text-xs text-slate-400">
            Más adelante podremos importar clientes desde Excel o desde tu CRM.
          </p>

          <form
            onSubmit={handleCreateClient}
            className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end"
          >
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">Nombre</label>
              <input
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">Email</label>
              <input
                type="email"
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">Teléfono</label>
              <input
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                value={form.telefono}
                onChange={e => setForm({ ...form, telefono: e.target.value })}
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="h-[38px] rounded-lg bg-emerald-500 text-sm font-medium text-slate-950 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? 'Guardando…' : 'Guardar cliente'}
            </button>
          </form>
        </section>

        {/* Tabla de clientes */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <h2 className="text-sm font-medium text-slate-100">
              Listado de clientes
            </h2>
            <span className="text-xs text-slate-500">
              {clientes.length} registro{clientes.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-900/80 text-xs text-slate-400">
                  <th className="px-4 py-2 text-left font-normal">Nombre</th>
                  <th className="px-4 py-2 text-left font-normal">Email</th>
                  <th className="px-4 py-2 text-left font-normal">Teléfono</th>
                  <th className="px-4 py-2 text-left font-normal">Alta</th>
                  <th className="px-4 py-2 text-left font-normal">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clientes.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-6 text-center text-xs text-slate-500"
                    >
                      Aún no tienes clientes creados.
                    </td>
                  </tr>
                )}

                {clientes.map(c => (
                  <tr
                    key={c.id}
                    className="border-t border-slate-800/80 hover:bg-slate-900/80"
                  >
                    <td className="px-4 py-2">{c.nombre}</td>
                    <td className="px-4 py-2 text-slate-300">{c.email}</td>
                    <td className="px-4 py-2 text-slate-300">
                      {c.telefono || '—'}
                    </td>
                    <td className="px-4 py-2 text-xs text-slate-500">
                      {c.created_at
                        ? new Date(c.created_at).toLocaleDateString('es-ES')
                        : '—'}
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => handleOpenCase(c.id)}
                        className="text-xs text-emerald-400 hover:text-emerald-300"
                      >
                        Ver expediente →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <p className="text-[11px] text-slate-500">
          Panel interno BKC Home · Gestión de hipotecas
        </p>
      </main>
    </div>
  );
}
