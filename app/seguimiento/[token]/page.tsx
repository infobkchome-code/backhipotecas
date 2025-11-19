'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type Caso = {
  id: string;
  titulo: string;
  estado: string;
  progreso: number;
  fecha_limite: string | null;
  updated_at: string;
};

export default function SeguimientoPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;

  const [loading, setLoading] = useState(true);
  const [caso, setCaso] = useState<Caso | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!token) return;

      const { data, error } = await supabase
        .from('casos')
        .select('id, titulo, estado, progreso, fecha_limite, updated_at')
        .eq('seguimiento_token', token)
        .single();

      if (error || !data) {
        setErrorMsg('Enlace de seguimiento no válido.');
        setLoading(false);
        return;
      }

      setCaso(data as Caso);
      setLoading(false);
    };

    load();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-300">Cargando expediente…</p>
      </div>
    );
  }

  if (errorMsg || !caso) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
        <div className="border border-red-700 bg-red-900/40 px-4 py-3 rounded-md">
          <p className="text-red-200 text-sm">{errorMsg || 'Expediente no encontrado.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-6">
      <header className="max-w-3xl mx-auto mb-6">
        <h1 className="text-xl font-semibold">{caso.titulo}</h1>
        <p className="text-xs text-slate-400">
          Seguimiento del expediente hipotecario
        </p>
      </header>

      <main className="max-w-3xl mx-auto space-y-6">

        {/* Aquí irá Bloque 2: Estado + Progreso */}
        {/* Aquí irá Bloque 3: Checklist cliente */}
        {/* Aquí irá Bloque 4: Subida documentos */}
        {/* Aquí irá Bloque 5: Mensajes del gestor */}

      </main>
    </div>
  );
}
