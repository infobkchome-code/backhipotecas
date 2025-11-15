'use client';

import { useEffect, useState, ChangeEvent } from 'react';
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
  seguimiento_token: string | null;
};

};

type FileItem = {
  name: string;
  created_at: string | null;
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

  // Documentos
  const [files, setFiles] = useState<FileItem[]>([]);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [docsMsg, setDocsMsg] = useState<string | null>(null);

  // Guardamos el userId en estado para reutilizarlo en Storage
  const [userId, setUserId] = useState<string | null>(null);

  // Carga del caso y del userId
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

      setUserId(user.id);

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
  seguimiento_token: c.seguimiento_token ?? null,
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

  // Cargar documentos de este expediente
  useEffect(() => {
    const loadDocs = async () => {
      if (!userId || !id) return;

      setDocsMsg(null);

      const prefix = `${userId}/${id}`;
      const { data, error } = await supabase.storage
        .from('docs')
        .list(prefix, {
          limit: 100,
          offset: 0,
        });

      if (error) {
        console.error('Error listando docs:', error);
        setDocsMsg('No se han podido cargar los documentos.');
        return;
      }

      const mapped: FileItem[] =
        data?.map((f) => ({
          name: f.name,
          created_at: f.created_at ?? null,
        })) ?? [];

      setFiles(mapped);
    };

    loadDocs();
  }, [userId, id]);

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

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setFileToUpload(file);
    setDocsMsg(null);
  };

  const handleUpload = async () => {
    if (!fileToUpload || !userId || !caso) return;
    setUploading(true);
    setDocsMsg(null);

    try {
      const ext = fileToUpload.name.split('.').pop();
      const timestamp = Date.now();
      const safeName = fileToUpload.name.replace(/\s+/g, '_');
      const path = `${userId}/${caso.id}/${timestamp}_${safeName}`;

      const { error } = await supabase.storage
        .from('docs')
        .upload(path, fileToUpload);

      if (error) {
        console.error('Error subiendo archivo:', error);
        setDocsMsg('No se ha podido subir el documento.');
        setUploading(false);
        return;
      }

      // Recargar listado
      const { data, error: listError } = await supabase.storage
        .from('docs')
        .list(`${userId}/${caso.id}`, { limit: 100, offset: 0 });

      if (listError) {
        console.error('Error recargando docs:', listError);
        setDocsMsg('Documento subido, pero no se pudo refrescar la lista.');
        setUploading(false);
        return;
      }

      const mapped: FileItem[] =
        data?.map((f) => ({
          name: f.name,
          created_at: f.created_at ?? null,
        })) ?? [];

      setFiles(mapped);
      setFileToUpload(null);
      setDocsMsg('Documento subido correctamente.');
      setUploading(false);
    } catch (err) {
      console.error(err);
      setDocsMsg('Error inesperado subiendo el documento.');
      setUploading(false);
    }
  };

  const handleDownload = async (fileName: string) => {
    if (!userId || !caso) return;
    const path = `${userId}/${caso.id}/${fileName}`;

    const { data, error } = await supabase.storage
      .from('docs')
      .createSignedUrl(path, 60 * 10); // 10 minutos

    if (error || !data?.signedUrl) {
      console.error('Error creando signed URL:', error);
      setDocsMsg('No se ha podido descargar el documento.');
      return;
    }

    window.open(data.signedUrl, '_blank');
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

  // 🔗 Enlace de seguimiento PÚBLICO para el cliente
  const trackingUrl = caso.seguimiento_token
  ? `https://backhipotecas.vercel.app/seguimiento/${caso.seguimiento_token}`
  : 'Aún no hay enlace de seguimiento para este expediente (falta token).';


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

      <main className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {/* Mensajes generales */}
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

        {/* Bloque: datos del expediente */}
        <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 space-y-4">
          <h2 className="text-sm font-semibold text-slate-200">
            Estado del expediente
          </h2>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Estado
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
                style={{
                  width: `${Math.min(100, Math.max(0, progreso))}%`,
                }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Notas internas
            </label>
            <textarea
              rows={4}
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

        {/* Bloque: Documentación */}
        <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-200">
              Documentación del expediente
            </h2>
          </div>

          {docsMsg && (
            <div className="rounded-md border border-slate-700 bg-slate-950/70 px-4 py-2 text-xs text-slate-200">
              {docsMsg}
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
            <input
              type="file"
              onChange={handleFileChange}
              className="text-xs text-slate-300"
            />
            <button
              type="button"
              onClick={handleUpload}
              disabled={!fileToUpload || uploading}
              className="px-4 py-2 rounded-md bg-slate-100 text-slate-900 text-xs font-medium hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Subiendo…' : 'Subir documento'}
            </button>
          </div>

          <div className="mt-3 border border-slate-800 rounded-md overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-900/80 text-slate-400">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">
                    Nombre del archivo
                  </th>
                  <th className="px-3 py-2 text-left font-medium">
                    Fecha de alta
                  </th>
                  <th className="px-3 py-2 text-left font-medium">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody>
                {files.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-3 py-3 text-center text-slate-500"
                    >
                      Aún no hay documentos subidos para este expediente.
                    </td>
                  </tr>
                )}
                {files.map((f) => (
                  <tr
                    key={f.name}
                    className="border-t border-slate-800 hover:bg-slate-900/50"
                  >
                    <td className="px-3 py-2 text-slate-100 break-all">
                      {f.name}
                    </td>
                    <td className="px-3 py-2 text-slate-400">
                      {f.created_at
                        ? new Date(f.created_at).toLocaleString('es-ES')
                        : '-'}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => handleDownload(f.name)}
                        className="text-emerald-400 hover:underline"
                      >
                        Descargar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 🔥 Bloque: Enlace de seguimiento para el cliente */}
        <section className="rounded-lg border border-emerald-700 bg-emerald-950/40 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-emerald-200">
            Enlace de seguimiento para el cliente
          </h2>
          <p className="text-xs text-emerald-200/80">
            Copia este enlace y envíaselo al cliente. Desde ahí podrá consultar
            el estado del expediente sin necesidad de usuario ni contraseña.
          </p>
          <div className="bg-slate-950 border border-emerald-700/70 rounded-md px-3 py-2 text-xs break-all text-emerald-100">
            {trackingUrl}
          </div>
        </section>
      </main>
    </div>
  );
}
