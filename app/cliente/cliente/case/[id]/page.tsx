'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type CasoDetalle = {
  id: string;
  titulo: string;
  estado: string;
  progreso: number;
  notas: string | null;
  created_at: string;
  clientes?: {
    nombre: string | null;
    email: string | null;
    telefono: string | null;
  } | null;
};

export default function ClienteCaseDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;
  const [caso, setCaso] = useState<CasoDetalle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/cliente/login');
        return;
      }

      const { data, error } = await supabase
        .from('casos')
        .select(
          'id, titulo, estado, progreso, notas, created_at, clientes ( nombre, email, telefono )'
        )
        .eq('id', id)
        .single();

      if (error) {
        console.error(error);
        setCaso(null);
      } else {
        setCaso(data);
      }

      setLoading(false);
    })();
  }, [id, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        Cargando…
      </div>
    );
  }

  if (!caso) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-3">
          <button
            onClick={() => router.push('/cliente')}
            className="text-xs text-emerald-400 hover:text-emerald-300 underline"
          >
            ← Volver al panel
          </button>
          <h1 className="text-xl font-semibold">Expediente no encontrado</h1>
          <p className="text-sm text-slate-400">
            Puede que el enlace haya caducado o que no tengas permisos para este expediente.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 px-4 py-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <button
          onClick={() => router.push('/cliente')}
          className="text-xs text-emerald-400 hover:text-emerald-300 underline"
        >
          ← Volver al panel
        </button>

        <h1 className="text-2xl font-semibold">Expediente hipotecario</h1>

        <div className="grid gap-4 md:grid-cols-[2fr,1.5fr]">
          {/* Datos del cliente */}
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
              <h2 className="text-sm font-semibold text-slate-200">Datos del cliente</h2>
              <p className="text-lg font-medium">
                {caso.clientes?.nombre || 'Cliente'}
              </p>
              <div className="text-sm text-slate-300">
                <p>{caso.clientes?.email}</p>
                {caso.clientes?.telefono && <p>{caso.clientes.telefono}</p>}
              </div>
              <p className="text-xs text-slate-500">
                Alta: {new Date(caso.created_at).toLocaleDateString('es-ES')}
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <h2 className="text-sm font-semibold text-slate-200">
                Estado del expediente
              </h2>
              <p className="text-sm text-slate-300">
                Estado:{' '}
                <span className="font-medium text-emerald-400">
                  {caso.estado.replace('_', ' ')}
                </span>
              </p>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Progreso</span>
                  <span>{caso.progreso}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500"
                    style={{ width: `${caso.progreso}%` }}
                  />
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Tu asesor actualizará aquí cada avance importante (envío al banco, tasación,
                aprobación, notaría…).
              </p>
            </div>
          </div>

          {/* Documentación (de momento solo informativo) */}
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <h2 className="text-sm font-semibold text-slate-200">Documentación</h2>
              <p className="text-xs text-slate-400">
                Aquí verás la documentación necesaria y el estado de recepción. En la siguiente
                fase conectaremos esta sección para que puedas subir los archivos directamente.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <h2 className="text-sm font-semibold text-slate-200">Notas del expediente</h2>
              <p className="text-sm text-slate-300 whitespace-pre-wrap">
                {caso.notas || 'Sin notas visibles por el momento.'}
              </p>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-slate-500">
          Panel exclusivo de cliente · BKC Home Hipotecas
        </p>
      </div>
    </div>
  );
}

