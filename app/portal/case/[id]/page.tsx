'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type CasoDetail = {
  id: string;
  titulo: string;
  estado: string;
  progreso: number;
  notas: string | null;
  created_at: string;
  updated_at: string;
  clientes: {
    id: string;
    nombre: string;
    email: string;
    telefono: string | null;
    created_at: string;
  } | null;
};

export default function CaseDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [data, setData] = useState<CasoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    (async () => {
      setLoading(true);
      setError(null);

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        setError('Error de autenticación.');
        setLoading(false);
        return;
      }
      if (!user) {
        router.push('/portal/login');
        return;
      }

      // Traemos el caso + datos del cliente
      const { data, error } = await supabase
        .from('casos')
        .select(`
          id,
          titulo,
          estado,
          progreso,
          notas,
          created_at,
          updated_at,
          clientes:cliente_id (
            id,
            nombre,
            email,
            telefono,
            created_at
          )
        `)
        .eq('id', id)
        .single();

      if (error || !data) {
        console.error(error);
        setError(
          'Expediente no encontrado. Puede que el enlace no sea correcto o que no tengas permisos sobre este expediente.'
        );
        setData(null);
      } else {
        setData(data as any);
      }

      setLoading(false);
    })();
  }, [id, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 px-6 py-6">
        <p className="text-sm text-slate-300">Cargando expediente…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 px-6 py-6">
        <Link
          href="/portal"
          className="text-xs text-emerald-400 hover:text-emerald-300"
        >
          ← Volver al panel de clientes
        </Link>

        <div className="mt-4 max-w-xl space-y-3">
          <h1 className="text-xl font-semibold">Expediente no encontrado</h1>
          <p className="text-sm text-slate-400">
            Puede que el enlace no sea correcto o que no tengas permisos sobre este
            expediente.
          </p>
        </div>
      </div>
    );
  }

  const c = data.clientes;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 px-6 py-6">
      <Link
        href="/portal"
        className="text-xs text-emerald-400 hover:text-emerald-300"
      >
        ← Volver al panel de clientes
      </Link>

      <div className="mt-4 max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna izquierda: datos + expediente */}
        <div className="lg:col-span-2 space-y-4">
          {/* Datos del cliente */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-slate-100 mb-2">
              Datos del cliente
            </h2>
            {c ? (
              <>
                <div className="text-sm font-medium">{c.nombre}</div>
                <div className="text-xs text-slate-300 mt-1">{c.email}</div>
                {c.telefono && (
                  <div className="text-xs text-slate-400 mt-1">{c.telefono}</div>
                )}
                <div className="text-[11px] text-slate-500 mt-2">
                  Alta:{' '}
                  {new Date(c.created_at).toLocaleDateString('es-ES')}
                </div>
              </>
            ) : (
              <div className="text-xs text-slate-400">
                No se han podido cargar los datos del cliente.
              </div>
            )}
          </div>

          {/* Datos del expediente */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-100">
                  Expediente {c?.nombre}
                </h2>
                <p className="text-[11px] text-slate-500">
                  Creado el{' '}
                  {new Date(data.created_at).toLocaleDateString('es-ES')}
                </p>
              </div>
              <span className="inline-flex items-center rounded-full bg-slate-800 px-2.5 py-0.5 text-[11px] text-slate-100 border border-slate-700">
                {data.estado === 'en_estudio' ? 'En estudio' : data.estado}
              </span>
            </div>

            <div className="space-y-2">
              <div className="text-[11px] text-slate-400">
                Progreso del expediente
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${data.progreso ?? 0}%` }}
                />
              </div>
              <div className="text-xs text-slate-300">
                {data.progreso ?? 0}% completado
              </div>
            </div>

            <div className="space-y-2 mt-4">
              <div className="text-sm font-semibold text-slate-100">
                Notas internas
              </div>
              <p className="text-sm text-slate-300 whitespace-pre-wrap">
                {data.notas || 'Expediente creado automáticamente.'}
              </p>
            </div>
          </div>
        </div>

        {/* Columna derecha: documentación */}
        <div className="space-y-4">
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-slate-100">
              Documentación
            </h2>
            <p className="text-xs text-slate-400">
              Aquí subiremos DNI, nóminas, renta, IRPF, contrato… (esta parte la
              conectaremos después con Supabase Storage).
            </p>

            <button
              type="button"
              className="w-full mt-2 inline-flex items-center justify-center rounded-lg bg-slate-800 text-xs text-slate-100 border border-slate-700 px-3 py-2 cursor-not-allowed opacity-60"
            >
              Subir documento (pendiente de implementar)
            </button>

            <div className="mt-3 border-t border-slate-800 pt-3">
              <h3 className="text-xs font-semibold text-slate-200 mb-1">
                Archivos subidos
              </h3>
              <p className="text-[11px] text-slate-500">
                Aún no hay documentos asociados a este expediente.
              </p>
            </div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 text-[11px] text-slate-400 space-y-1">
            <p>✅ Cada cliente tiene su expediente único.</p>
            <p>✅ Solo tú (usuario autenticado) puedes ver estos datos.</p>
            <p>✅ Más adelante podremos añadir tareas, hitos y alertas.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
