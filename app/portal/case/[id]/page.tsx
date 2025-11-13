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
    progress: 10,
    description: 'Hemos recibido la operación y la estamos analizando.',
  },
  {
    key: 'documentacion_pendiente',
    label: 'Documentación pendiente',
    progress: 25,
    description: 'Estamos a la espera de que el cliente envíe toda la documentación.',
  },
  {
    key: 'enviado_al_banco',
    label: 'Enviado al banco',
    progress: 40,
    description: 'La operación está siendo estudiada por el banco.',
  },
  {
    key: 'tasacion',
    label: 'Tasación',
    progress: 60,
    description: 'La vivienda está en fase de tasación.',
  },
  {
    key: 'aprobado',
    label: 'Aprobado',
    progress: 80,
    description: 'La hipoteca ha sido aprobada. Preparando firma.',
  },
  {
    key: 'firma_en_notaria',
    label: 'Firma en notaría',
    progress: 95,
    description: 'Coordinando fecha y documentación para la firma en notaría.',
  },
  {
    key: 'finalizado',
    label: 'Finalizado',
    progress: 100,
    description: 'Operación finalizada y firmada.',
  },
  {
    key: 'rechazado',
    label: 'Rechazado',
    progress: 0,
    description: 'La operación no ha podido ser aprobada.',
  },
] as const;

function getEstadoInfo(estado: string) {
  return ESTADOS.find((e) => e.key === estado) ?? ESTADOS[0];
}

export default function PortalCaseDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;

  const [caso, setCaso] = useState<CasoDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [estado, setEstado] = useState<string>('en_estudio');
  const [progreso, setProgreso] = useState<number>(0);
  const [notas, setNotas] = useState<string>('');

  useEffect(() => {
    if (!id) return;

    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/portal/login');
        return;
      }

      const { data, error } = await supabase
        .from('casos')
        .select(
          'id, titulo, estado, progreso, notas, created_at, clientes ( nombre, email, telefono )'
        )
        .eq('id', id)
        .eq('user_id', user.id) // seguridad: solo ves tus casos
        .single();

      if (error) {
        console.error(error);
        setCaso(null);
      } else if (data) {
        setCaso(data);
        setEstado(data.estado || 'en_estudio');
        setProgreso(typeof data.progreso === 'number' ? data.progreso : 0);
        setNotas(data.notas ?? '');
      }

      setLoading(false);
    })();
  }, [id, router]);

  const handleEstadoChange = (nuevoEstado: string) => {
    setEstado(nuevoEstado);
    const info = getEstadoInfo(nuevoEstado);
    setProgreso(info.progress);
  };

  const handleSave = async () => {
    if (!caso) return;
    setSaving(true);
    setError(null);
    setOk(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      setError('Sesión caducada. Vuelve a entrar al portal.');
      return;
    }

    const { error } = await supabase
      .from('casos')
      .update({
        estado,
        progreso,
        notas,
      })
      .eq('id', caso.id)
      .eq('user_id', user.id);

    setSaving(false);

    if (error) {
      console.error(error);
      setError('No se pudieron guardar los cambios. Intenta de nuevo.');
    } else {
      setOk('Cambios guardados correctamente.');
      setCaso((prev) =>
        prev
          ? {
              ...prev,
              estado,
              progreso,
              notas,
            }
          : prev
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        Cargando expediente…
      </div>
    );
  }

  if (!caso) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-3">
          <button
            onClick={() => router.push('/portal')}
            className="text-xs text-emerald-400 hover:text-emerald-300 underline"
          >
            ← Volver al panel de clientes
          </button>
          <h1 className="text-xl font-semibold">Expediente no encontrado</h1>
          <p className="text-sm text-slate-400">
            Puede que el enlace no sea correcto o que no tengas permisos sobre este expediente.
          </p>
        </div>
      </div>
    );
  }

  const estadoInfo = getEstadoInfo(estado);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 px-4 py-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <button
          onClick={() => router.push('/portal')}
          className="text-xs text-emerald-400 hover:text-emerald-300 underline"
        >
          ← Volver al panel de clientes
        </button>

        <header className="space-y-1">
          <p className="text-xs text-emerald-400 uppercase tracking-wide">
            Panel interno · BKC Hipotecas
          </p>
          <h1 className="text-2xl font-semibold">
            Expediente hipotecario – {caso.clientes?.nombre || 'Cliente'}
          </h1>
          <p className="text-xs text-slate-500">
            Alta: {new Date(caso.created_at).toLocaleDateString('es-ES')}
          </p>
        </header>

        {(error || ok) && (
          <div className="space-y-2">
            {ok && (
              <div className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/40 rounded-lg px-3 py-2">
                {ok}
              </div>
            )}
            {error && (
              <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/40 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-[2fr,1.5fr]">
          {/* Columna izquierda: datos + control del estado */}
          <div className="space-y-4">
            {/* Datos del cliente */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
              <h2 className="text-sm font-semibold text-slate-200">Datos del cliente</h2>
              <p className="text-lg font-medium">
                {caso.clientes?.nombre || 'Cliente'}
              </p>
              <div className="text-sm text-slate-300">
                <p>{caso.clientes?.email}</p>
                {caso.clientes?.telefono && <p>{caso.clientes.telefono}</p>}
              </div>
            </div>

            {/* Control de estado y progreso */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-200">
                    Estado del expediente
                  </h2>
                  <p className="text-xs text-slate-400">
                    Selecciona el estado actual de la operación. El progreso se ajusta
                    automáticamente, pero puedes retocarlo a mano.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">
                    Estado
                  </label>
                  <select
                    value={estado}
                    onChange={(e) => handleEstadoChange(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    {ESTADOS.map((e) => (
                      <option key={e.key} value={e.key}>
                        {e.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-400 mt-1">{estadoInfo.description}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Progreso del expediente</span>
                    <span>{progreso}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={progreso}
                    onChange={(e) => setProgreso(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all"
                      style={{ width: `${progreso}%` }}
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center justify-center rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-medium px-4 py-2 transition disabled:opacity-60"
              >
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>

            {/* Notas internas */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <h2 className="text-sm font-semibold text-slate-200">Notas internas</h2>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={5}
                className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-y"
                placeholder="Apunta aquí comentarios internos, estado real con el banco, condiciones, etc."
              />
              <p className="text-[11px] text-slate-500">
                Estas notas son solo para uso interno. El cliente verá solo el estado y el progreso.
              </p>
            </div>
          </div>

          {/* Columna derecha: documentación / info cliente */}
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <h2 className="text-sm font-semibold text-slate-200">Documentación</h2>
              <p className="text-xs text-slate-400">
                Próximo paso: conectar aquí la subida de documentación al bucket <code>docs</code> de Supabase.
                De momento puedes seguir gestionando los documentos por email o WhatsApp.
              </p>
              <ul className="text-xs text-slate-400 list-disc pl-4 space-y-1">
                <li>DNI / NIE de los intervinientes</li>
                <li>Últimas nóminas o justificantes de ingresos</li>
                <li>Vida laboral actualizada</li>
                <li>Contrato de arras / señal, si lo hubiera</li>
              </ul>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
              <h2 className="text-sm font-semibold text-slate-200">Privacidad</h2>
              <ul className="text-xs text-slate-400 space-y-1">
                <li>✅ Cada cliente tiene su expediente único.</li>
                <li>✅ Solo tú (usuario autenticado) puedes ver estos datos en el portal interno.</li>
                <li>✅ El cliente solo ve estado y progreso desde su propio acceso.</li>
              </ul>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-slate-500">
          Panel interno BKC Home · Gestión de hipotecas
        </p>
      </div>
    </div>
  );
}
