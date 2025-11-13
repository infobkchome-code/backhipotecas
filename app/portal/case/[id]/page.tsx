'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

type Caso = {
  id: string;
  titulo: string;
  estado: string;
  progreso: number;
  notas: string | null;
  created_at: string;
  updated_at: string;
};

const ESTADOS = [
  { value: 'en_estudio', label: 'En estudio' },
  { value: 'tasacion', label: 'Tasación' },
  { value: 'fein', label: 'FEIN / Oferta' },
  { value: 'notaria', label: 'Notaría' },
  { value: 'compraventa', label: 'Firma compraventa' },
  { value: 'fin', label: 'Expediente finalizado' },
  { value: 'denegado', label: 'Denegado' },
];

export default function CaseDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id as string;

  const [caso, setCaso] = useState<Caso | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Campos editables
  const [estado, setEstado] = useState('en_estudio');
  const [progreso, setProgreso] = useState(0);
  const [notas, setNotas] = useState('');

  // Cargar caso
  useEffect(() => {
    const fetchCase = async () => {
      setLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setErrorMsg('Debes iniciar sesión para ver este expediente.');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('casos')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        console.error(error);
        setErrorMsg(
          'No se ha encontrado este expediente o no tienes permisos para verlo.',
        );
        setLoading(false);
        return;
      }

      const c = data as any;

      const casoNormalizado: Caso = {
        id: c.id,
        titulo: c.titulo,
        estado: c.estado,
        progreso: c.progreso ?? 0,
        notas: c.notas ?? '',
        created_at: c.created_at,
        updated_at: c.updated_at,
      };

      setCaso(casoNormalizado);
      setEstado(casoNormalizado.estado);
      setProgreso(casoNormalizado.progreso);
      setNotas(casoNormalizado.notas ?? '');
      setLoading(false);
    };

    if (id) {
      fetchCase();
    }
  }, [id]);

  const handleSave = async () => {
    if (!caso) return;
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMsg('Sesión no válida. Vuelve a iniciar sesión.');
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from('casos')
      .update({
        estado,
        progreso: Number(progreso) || 0,
        notas,
      })
      .eq('id', caso.id)
      .eq('user_id', user.id);

    if (error) {
      console.error(error);
      setErrorMsg('No se han podido guardar los cambios.');
      setSaving(false);
      return;
    }

    setSuccessMsg('Cambios guardados correctamente.');
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <div className="text-sm text-slate-300">Cargando expediente…</div>
      </div>
    );
  }

  if (!caso) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col items-center justify-center px-4">
        <p className="text-lg font-semibold mb-2">Expediente no encontrado</p>
        <p className="text-sm text-slate-400 mb-4">
          Puede que el enlace no sea correcto o que no tengas permisos sobre
          este expediente.
        </p>
        <Link
          href="/portal"
          className="text-emerald-400 text-sm hover:underline"
        >
          ← Volver al panel de clientes
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* Barra superior */}
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push('/portal')}
            className="text-xs text-slate-400 hover:text-slate-200 mb-1"
          >
            ← Volver al panel de clientes
          </button>
          <h1 className="text-xl font-semibold">{caso.titulo}</h1>
          <p className="text-xs text-slate-400">
            Expediente hipotecario · creado el{' '}
            {new Date(caso.created_at).toLocaleDateString('es-ES')}
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-6 space-y-4">
        {/* Mensajes */}
        {errorMsg && (
          <div className="rounded-md border border-red-600 bg-red-950/60 px-4 py-2 text-sm text-red-100">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="rounded-md border border-emerald-600 bg-emerald-950/60 px-4 py-2 text-sm text-emerald-100">
            {successMsg}
          </div>
        )}

        {/* Formulario de edición */}
        <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Estado del expediente
            </label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {ESTADOS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Progreso aproximado (%)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={progreso}
              onChange={(e) => setProgreso(Number(e.target.value))}
              className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <div className="mt-1 h-2 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-2 bg-emerald-500 transition-all"
                style={{ width: `${Math.min(100, Math.max(0, progreso))}%` }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Notas internas
            </label>
            <textarea
              rows={5}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="Ej.: FEIN emitida, tasación en curso, pendiente de documentación, etc."
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => router.push('/portal')}
              className="px-4 py-2 rounded-md border border-slate-700 text-sm text-slate-200 hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-md bg-emerald-500 text-slate-950 text-sm font-medium hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
