'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type Caso = {
  id: string;
  titulo: string;
  estado: string;
  progreso: number;
  created_at: string;
clientes?: {
  nombre: string | null;
}[] | null;


export default function ClienteDashboardPage() {
  const router = useRouter();
  const [casos, setCasos] = useState<Caso[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/cliente/login');
        return;
      }

      const { data, error } = await supabase
        .from('casos')
        .select('id, titulo, estado, progreso, created_at, clientes ( nombre )')
        .order('created_at', { ascending: true });

      if (error) {
        console.error(error);
      } else {
        setCasos(data || []);
      }

      setLoading(false);
    })();
  }, [router]);

  if (loading) {
    return <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">Cargando…</div>;
  }

  if (!casos.length) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-xl font-semibold">No hemos encontrado tu expediente</h1>
          <p className="text-sm text-slate-400">
            Asegúrate de usar el mismo correo que diste a BKC Home. Si el problema continúa, contáctanos.
          </p>
        </div>
      </div>
    );
  }

  const caso = casos[0]; // normalmente uno por cliente

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 px-4 py-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs text-emerald-400 uppercase tracking-wide">Panel del cliente</p>
            <h1 className="text-2xl font-semibold mt-1">
Hola {caso.clientes?.[0]?.nombre || ''}, este es el estado de tu hipoteca
            </h1>
          </div>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push('/cliente/login');
            }}
            className="text-xs text-slate-400 hover:text-slate-200 underline"
          >
            Cerrar sesión
          </button>
        </header>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide">Expediente</p>
              <h2 className="text-lg font-semibold">{caso.titulo}</h2>
            </div>
            <button
              onClick={() => router.push(`/cliente/case/${caso.id}`)}
              className="text-xs px-3 py-1 rounded-full bg-emerald-500 text-slate-950 font-medium hover:bg-emerald-400"
            >
              Ver detalle
            </button>
          </div>

          <div className="text-sm text-slate-300">
            Estado:{' '}
            <span className="font-medium text-emerald-400">
              {caso.estado.replace('_', ' ')}
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Progreso del expediente</span>
              <span>{caso.progreso}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${caso.progreso}%` }}
              />
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Fecha de apertura: {new Date(caso.created_at).toLocaleDateString('es-ES')}
          </p>
        </div>

        <p className="text-xs text-slate-500">
          Este panel es solo informativo. Cualquier cambio de estado lo hará tu asesor de BKC Home.
        </p>
      </div>
    </div>
  );
}

