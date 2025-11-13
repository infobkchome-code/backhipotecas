'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

type Caso = {
  id: string;
  titulo: string;
  estado: string;
  progreso: number;
  notas: string | null;
  created_at: string;
  cliente: {
    id: string;
    nombre: string;
    email: string;
    telefono: string | null;
    created_at: string;
  } | null;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

export default function CaseDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [caso, setCaso] = useState<Caso | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!params?.id) return;

      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) {
        setLoading(false);
        return;
      }

      // Traemos el caso + info del cliente, filtrando también por user_id
      const { data, error } = await supabase
        .from('casos')
        .select(
          `
          id,
          titulo,
          estado,
          progreso,
          notas,
          created_at,
          clientes:cliente_id (
            id,
            nombre,
            email,
            telefono,
            created_at
          )
        `
        )
        .eq('id', params.id as string)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data) {
        setCaso({
          id: data.id,
          titulo: data.titulo,
          estado: data.estado,
          progreso: data.progreso ?? 0,
          notas: data.notas,
          created_at: data.created_at,
          cliente: data.clientes ?? null,
        });
      }

      setLoading(false);
    };

    load();
  }, [params, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
        <div className="text-sm text-gray-300">Cargando expediente…</div>
      </div>
    );
  }

  if (!caso) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 max-w-md w-full text-center space-y-4">
          <Link
            href="/portal"
            className="inline-block text-xs text-emerald-400 hover:text-emerald-300"
          >
            ← Volver al panel de clientes
          </Link>
          <h1 className="text-lg font-semibold">Expediente no encontrado</h1>
          <p className="text-xs text-gray-400">
            Puede que el enlace no sea correcto o que no tengas permisos sobre
            este expediente.
          </p>
        </div>
      </div>
    );
  }

  const c = caso.cliente;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 px-6 py-4">
        <Link
          href="/portal"
          className="inline-block text-xs text-emerald-400 hover:text-emerald-300 mb-1"
        >
          ← Volver al panel de clientes
        </Link>
        <h1 className="text-xl font-semibold">Expediente hipotecario</h1>
        <p className="text-xs text-gray-400">
          Seguimiento del cliente y gestión de documentación.
        </p>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Datos del cliente */}
          <section className="md:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-2">
            <h2 className="text-sm font-semibold text-gray-100">
              Datos del cliente
            </h2>
            {c ? (
              <div className="text-sm text-gray-200 space-y-1">
                <div className="font-medium">{c.nombre}</div>
                <div className="text-gray-300">{c.email}</div>
                <div className="text-gray-300">{c.telefono || '—'}</div>
                <div className="text-xs text-gray-500">
                  Alta: {formatDate(c.created_at)}
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-500">
                Cliente no vinculado al expediente.
              </div>
            )}
          </section>

          {/* Panel lateral de documentación */}
          <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-100">
              Documentación
            </h2>
            <p className="text-xs text-gray-400">
              Sube aquí DNIs, nóminas, IRPF, contrato, etc.
            </p>
            <div>
              <input type="file" className="text-xs text-gray-300" />
            </div>
            <div className="text-xs text-gray-500 border-t border-gray-800 pt-3">
              <p>Aún no hay documentos asociados a este expediente.</p>
            </div>
            <div className="text-xs text-gray-500 border-t border-gray-800 pt-3 space-y-1">
              <p>✅ Cada cliente tiene su expediente único.</p>
              <p>✅ Solo tú puedes ver estos datos en el portal interno.</p>
            </div>
          </section>
        </div>

        {/* Bloque de estado del expediente */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-gray-100">
              Expediente {c?.nombre}
            </h2>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-gray-800 text-emerald-300">
              Estado: {caso.estado.replace('_', ' ')}
            </span>
          </div>

          <div className="text-xs text-gray-400">
            Creado el {formatDate(caso.created_at)}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Progreso del expediente</span>
              <span>{caso.progreso}%</span>
            </div>
            <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
              <div
                className="h-full bg-emerald-500"
                style={{ width: `${caso.progreso}%` }}
              />
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="text-xs font-semibold text-gray-200">
              Notas internas
            </h3>
            <p className="text-sm text-gray-300 whitespace-pre-wrap">
              {caso.notas || 'Sin notas.'}
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
