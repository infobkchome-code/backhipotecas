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

const ESTADOS = [
  {
    key: 'en_estudio',
    label: 'En estudio',
    description: 'Estamos analizando tu operación y viabilidad.',
  },
  {
    key: 'documentacion_pendiente',
    label: 'Documentación pendiente',
    description: 'Faltan uno o varios documentos por entregar.',
  },
  {
    key: 'enviado_al_banco',
    label: 'Enviado al banco',
    description: 'Tu operación está siendo estudiada por la entidad bancaria.',
  },
  {
    key: 'tasacion',
    label: 'Tasación',
    description: 'La vivienda está en proceso de tasación.',
  },
  {
    key: 'aprobado',
    label: 'Aprobado',
    description: 'La hipoteca ha sido aprobada. Estamos preparando la firma.',
  },
  {
    key: 'firma_en_notaria',
    label: 'Firma en notaría',
    description: 'Coordinando fecha y documentación para la firma.',
  },
  {
    key: 'finalizado',
    label: 'Finalizado',
    description: 'Operación finalizada con éxito.',
  },
  {
    key: 'rechazado',
    label: 'Rechazado',
    description: 'La operación no ha podido ser aprobada.',
  },
] as const;

function getEstadoIndex(estado: string) {
  const idx = ESTADOS.findIndex((e) => e.key === estado);
  return idx === -1 ? 0 : idx;
}

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
        Cargando tu expediente…
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
            Asegúrate de entrar desde el enlace más reciente que te hemos enviado.
          </p>
        </div>
      </div>
    );
  }

  const currentIndex = getEstadoIndex(caso.estado);

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
          {/* Lado izquierdo */}
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

            {/* Timeline de estados */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-200">
                    Estado de tu hipoteca
                  </h2>
                  <p className="text-xs text-slate-400">
                    Te mostramos en qué punto exacto está tu operación.
                  </p>
                </div>
                <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/40">
                  {caso.progreso}% completado
                </span>
              </div>

              <ol className="space-y-3">
                {ESTADOS.map((step, index) => {
                  const done = index < currentIndex;
                  const current = index === currentIndex;
                  return (
                    <li key={step.key} className="flex gap-3 items-start">
                      <div
                        className={[
                          'mt-1 h-5 w-5 rounded-full flex items-center justify-center text-[10px] border',
                          done
                            ? 'bg-emerald-500 text-slate-950 border-emerald-500'
                            : current
                            ? 'bg-slate-900 text-emerald-400 border-emerald-500'
                            : 'bg-slate-950 text-slate-500 border-slate-600',
                        ].join(' ')}
                      >
                        {done ? '✓' : index + 1}
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          {step.label}
                          {current && (
                            <span className="ml-2 text-[11px] text-emerald-400">
                              (estado actual)
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-slate-400">{step.description}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
              <h2 className="text-sm font-semibold text-slate-200">Notas importantes</h2>
              <p className="text-sm text-slate-300">
                Tu asesor actualiza el estado cuando hay un avance relevante (envío al banco,
                tasación, aprobación, firma…). Si tienes dudas, puedes escribirle directamente.
              </p>
            </div>
          </div>

          {/* Lado derecho */}
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <h2 className="text-sm font-semibold text-slate-200">Documentación</h2>
              <p className="text-xs text-slate-400">
                En la siguiente fase podrás ver aquí qué documentos están pendientes y cuáles ya
                hemos recibido. De momento te avisaremos por email o WhatsApp de cualquier falta.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <h2 className="text-sm font-semibold text-slate-200">Resumen interno</h2>
              <p className="text-sm text-slate-300 whitespace-pre-wrap">
                {caso.notas
                  ? 'Parte de la información de tu expediente puede estar resumida aquí por tu asesor.'
                  : 'Tu expediente está en marcha. Si necesitas un resumen personalizado, pídeselo a tu asesor.'}
              </p>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-slate-500">
          Panel del cliente BKC Home · Seguimiento de hipoteca
        </p>
      </div>
    </div>
  );
}
