'use client';

import { useEffect, useState } from 'react';

type Expediente = {
  id: string;
  user_id?: string;
  cliente_id?: string;
  titulo?: string;
  estado?: string; // 'documentacion' | 'analisis' | 'tasacion' | 'notaria' | ...
  progreso?: number; // 0-100
  notas?: string;
  created_at?: string;
  updated_at?: string;
  email?: string | null;
  public_token?: string;
  seguimiento_token?: string;
};

type ApiResponse =
  | {
      ok: boolean;
      expediente?: Expediente;
      data?: Expediente;
      caso?: Expediente;
      message?: string;
    }
  | Expediente;

interface PageProps {
  params: { token: string };
}

const STEPS = [
  { id: 'documentacion', label: 'Documentación' },
  { id: 'analisis', label: 'Análisis' },
  { id: 'tasacion', label: 'Tasación' },
  { id: 'notaria', label: 'Firma en notaría' },
];

// Normalizamos y mapeamos estados del backend a estados estándar
function normalizarEstado(estado?: string | null): string {
  if (!estado) return '';

  // Pasamos a minúsculas, quitamos tildes y convertimos espacios a guiones bajos
  let e = estado
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  e = e.replace(/\s+/g, '_'); // "En estudio" -> "en_estudio"

  // Mapeos específicos backend -> estándar
  if (e === 'en_estudio' || e === 'estudio') return 'analisis';

  return e;
}

// Texto descriptivo para el párrafo
function getEstadoDescripcion(estado: string) {
  const e = normalizarEstado(estado);

  if (e === 'documentacion')
    return 'Estamos recopilando y revisando toda la documentación necesaria para tu hipoteca.';
  if (e === 'analisis')
    return 'Nuestro equipo está analizando tu operación y las diferentes opciones de financiación.';
  if (e === 'tasacion')
    return 'La vivienda se encuentra en fase de tasación por parte de una sociedad homologada.';
  if (e === 'notaria' || e === 'firma')
    return 'Tu hipoteca está lista para la firma en notaría. Pronto nos pondremos en contacto contigo para cerrar fecha y hora.';

  return 'Estamos trabajando en tu expediente. En breve verás aquí el detalle actualizado de cada fase.';
}

// Porcentaje de progreso
function getProgreso(expediente: Expediente | null): number {
  if (!expediente) return 0;
  if (typeof expediente.progreso === 'number') return expediente.progreso;

  const estado = normalizarEstado(expediente.estado);
  if (!estado) return 10;

  if (estado === 'documentacion') return 20;
  if (estado === 'analisis') return 45;
  if (estado === 'tasacion') return 70;
  if (estado === 'notaria' || estado === 'firma') return 95;

  return 10;
}

// Texto que se muestra en el “chip” de estado
function getEstadoChipText(estado?: string | null): string {
  const e = normalizarEstado(estado);

  if (e === 'documentacion') return 'Documentación';
  if (e === 'analisis') return 'En estudio';
  if (e === 'tasacion') return 'Tasación';
  if (e === 'notaria' || e === 'firma') return 'Firma en notaría';

  if (!estado) return 'En curso';

  const original = estado.replace(/_/g, ' ');
  return original.charAt(0).toUpperCase() + original.slice(1);
}

export default function SeguimientoPage({ params }: PageProps) {
  const { token } = params;

  const [expediente, setExpediente] = useState<Expediente | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelado = false;

    async function cargarExpediente() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/seguimiento/${token}`, {
          method: 'GET',
          cache: 'no-store',
        });

        if (!res.ok) {
          throw new Error('No hemos encontrado ningún expediente asociado a este enlace.');
        }

        const json: ApiResponse = await res.json();

        // Intentamos localizar la propiedad que contiene el expediente
        const e =
          (json as any).expediente ||
          (json as any).data ||
          (json as any).caso ||
          (json as any);

        if (!e || typeof e !== 'object') {
          throw new Error('No hemos podido cargar los datos del expediente.');
        }

        if (!cancelado) {
          setExpediente(e as Expediente);
        }
      } catch (err: any) {
        console.error(err);
        if (!cancelado) {
          setError(
            err?.message ||
              'Ha ocurrido un error al cargar el expediente. Por favor, revisa el enlace o contacta con nosotros.'
          );
        }
      } finally {
        if (!cancelado) setLoading(false);
      }
    }

    cargarExpediente();

    return () => {
      cancelado = true;
    };
  }, [token]);

  const progreso = getProgreso(expediente);
  const estadoNormalizado = normalizarEstado(expediente?.estado);
  const estadoLabel = getEstadoChipText(expediente?.estado);

  const currentStepIndex =
    STEPS.findIndex((s) => s.id === estadoNormalizado) !== -1
      ? STEPS.findIndex((s) => s.id === estadoNormalizado)
      : Math.min(
          3,
          Math.floor((progreso / 100) * (STEPS.length === 0 ? 1 : STEPS.length))
        );

  async function handleCopy() {
    if (!expediente?.seguimiento_token) return;
    try {
      await navigator.clipboard.writeText(expediente.seguimiento_token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  }

  // ESTADOS DE CARGA / ERROR
  if (loading) {
