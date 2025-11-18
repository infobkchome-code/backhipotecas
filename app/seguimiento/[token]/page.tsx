'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

type SeguimientoCaso = {
  id: string;
  titulo: string;
  estado: string;
  progreso: number;
  notas: string | null;
  created_at: string;
  updated_at: string;
};

type ApiResponse = {
  data?: SeguimientoCaso;
  error?: string;
};

const ESTADO_LABEL: Record<string, string> = {
  en_estudio: 'En estudio',
  tasacion: 'Tasación',
  fein: 'FEIN / Oferta',
  notaria: 'Notaría',
  compraventa: 'Firma compraventa',
  fin: 'Expediente finalizado',
  denegado: 'Denegado',
};

export default function SeguimientoPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;

  const [caso, setCaso] = useState<SeguimientoCaso | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!token) return;

      setLoading(true);
      setErrorMsg(null);

      try {
        const res = await fetch(`/api/seguimiento/${token}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
        });

        const json: ApiResponse = await res.json();

        if (!res.ok) {
          if (json.error === 'not_found') {
            setErrorMsg(
              'No hemos encontrado ningún expediente asociado a este enlace. Es posible que haya caducado o sea incorrecto.'
            );
          } else {
            setErrorMsg('Error al cargar el seguimiento del expediente.');
          }
          setLoading(false);
          return;
        }

        if (!json.data) {
          setErrorMsg(
            'No hemos encontrado ningún expediente asociado a este enlace.'
          );
          setLoading(false);
          return;
        }

        setCaso(json.data);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setErrorMsg('Error inesperado al cargar el expediente.');
        setLoading(false);
      }
    };

    loadData();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <div className="text-sm text-slate-300">Cargando expediente…</div>
      </div>
    );
  }

  if (errorMsg || !caso) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-lg font-semibold">Enlace de seguimiento no válido</h1>
          <p className="text-sm text-slate-300">{errorMsg}</p>
        </div>
      </div>
    );
  }

  const estadoLabel = ESTADO_LABEL[caso.estado] ?? 'En curso';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <main className="max-w-2xl mx-auto px-6 py-10 space-y-6">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-emerald-400">
            Seguimiento de expediente hipotecario
          </p>
          <h1 className="text-2xl font-semibold">{caso.titulo}</h1>
          <p className="text-xs text-slate-400">
            Creado el{' '}
            {new Date(caso.created_at).toLocaleDateString('es-ES')}
          </p>
        </header>

        <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 space-y-4">
          <div>
            <p className="text-xs text-slate-400 mb-1">Estado actual</p>
            <p className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
              {estadoLabel}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-400 mb-1">
              Avance aproximado del expediente
            </p>
            <div className="mt-1 h-2 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-2 bg-emerald-500 transition-all"
                style={{
                  width: `${Math.min(100, Math.max(0, caso.progreso ?? 0))}%`,
                }}
              />
            </div>
            <p className="mt-1 text-xs text-slate-300">
              {Math.min(100, Math.max(0, caso.progreso ?? 0))}% completado
            </p>
          </div>

          {caso.notas && (
            <div>
              <p className="text-xs text-slate-400 mb-1">
                Comentarios de tu gestor
              </p>
              <p className="text-sm text-slate-100 whitespace-pre-wrap">
                {caso.notas}
              </p>
            </div>
          )}
        </section>

        <footer className="text-xs text-slate-500">
          Última actualización:{' '}
          {new Date(caso.updated_at).toLocaleString('es-ES')}
        </footer>
      </main>
    </div>
  );
}
