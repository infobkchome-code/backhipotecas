'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

type CasoConCliente = {
  id: string;
  titulo: string;
  progreso: number;
  estado: string;
  seguimiento_token: string;
  created_at: string;
  cliente: {
    nombre: string;
    email: string;
    telefono: string;
  };
};

export default function PortalPage() {
  const [casos, setCasos] = useState<CasoConCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);

      // 1️⃣ VALIDAR SESIÓN
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError || !user) {
        // 👉 sin sesión → redirigimos al login
        router.push('/login');
        return;
      }

      try {
        // 2️⃣ Cargar todos los casos del usuario logueado
        const { data, error } = await supabase
          .from('casos')
          .select(
            `
            id, titulo, progreso, estado, seguimiento_token, created_at,
            cliente:clientes (nombre, email, telefono)
            `
          )
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error(error);
          setError('Error cargando tus expedientes.');
          return;
        }

        setCasos(data || []);
      } catch (err: any) {
        console.error(err);
        setError('Error inesperado cargando el panel.');
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        Cargando panel…
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Clientes y expedientes</h1>
        <p className="text-sm text-slate-400">
          Aquí ves todos tus clientes y accedes a su expediente.
        </p>
      </header>

      <div className="flex justify-end mb-4">
        <button
          onClick={() => router.push('/portal/clients/new')}
          className="rounded-md bg-emerald-500 text-slate-950 px-4 py-2 text-sm font-medium hover:bg-emerald-400 transition"
        >
          + Nuevo cliente
        </button>
      </div>

      <table className="w-full text-sm border-separate border-spacing-y-2">
        <thead className="text-slate-400 text-xs uppercase">
          <tr>
            <th align="left">Cliente</th>
            <th align="left">Contacto</th>
            <th align="left">Fechas</th>
            <th align="left">Expediente</th>
            <th align="left">Progreso</th>
            <th align="left">Acciones</th>
          </tr>
        </thead>

        <tbody>
          {casos.map((c) => (
            <tr key={c.id} className="bg-slate-900/60 rounded-lg">
              <td className="py-3 px-2">{c.cliente?.nombre}</td>
              <td className="py-3 px-2">{c.cliente?.email}</td>
              <td className="py-3 px-2">
                Alta: {new Date(c.created_at).toLocaleDateString('es-ES')}
              </td>
              <td className="py-3 px-2">{c.titulo}</td>
              <td className="py-3 px-2">{c.progreso}%</td>

              <td className="py-3 px-2 space-x-3">
                <button
                  onClick={() => router.push(`/portal/case/${c.id}`)}
                  className="text-emerald-400 hover:underline"
                >
                  Ver expediente →
                </button>

                <button
                  onClick={() =>
                    router.push(`/seguimiento/${c.seguimiento_token}`)
                  }
                  className="text-emerald-300 hover:underline"
                >
                  Ver como cliente →
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {casos.length === 0 && (
        <p className="text-center text-slate-500 mt-6">
          No hay clientes todavía.
        </p>
      )}
    </div>
  );
}
