'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useParams } from 'next/navigation';

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [c, setC] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setLoading(false);

      const { data, error } = await supabase
        .from('casos')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (!error) setC(data);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="p-6">Cargando…</div>;
  if (!c) return <div className="p-6">Caso no encontrado.</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">{c.titulo}</h1>
      <div className="text-sm text-gray-600">Estado: {c.estado} · Progreso: {c.progreso}%</div>
      <p className="text-gray-800 whitespace-pre-wrap">{c.notas || 'Sin notas'}</p>
    </div>
  );
}
