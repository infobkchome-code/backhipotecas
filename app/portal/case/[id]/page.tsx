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

type FileItem = {
  id: string;
  tipo: string;
  nombre_archivo: string;
  storage_path: string;
  created_at: string;
};

type LogItem = {
  id: string;
  created_at: string;
  tipo: string;
  descripcion: string | null;
  visible_cliente: boolean;
};

type NotaItem = {
  id: string;
  contenido: string;
  created_at: string;
  user_id: string | null;
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

const DOC_TIPOS = [
  { value: 'dni', label: 'DNI / NIE' },
  { value: 'nomina', label: 'Nómina' },
  { value: 'contrato', label: 'Contrato de trabajo' },
  { value: 'vida_laboral', label: 'Vida laboral' },
  { value: 'irpf', label: 'IRPF / Renta' },
  { value: 'tasacion', label: 'Tasación' },
  { value: 'fein', label: 'FEIN / Oferta' },
  { value: 'otros', label: 'Otros' },
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
  const [docTipo, setDocTipo] = useState('otros');
  const [uploading, setUploading] = useState(false);
  const [docsMsg, setDocsMsg] = useState<string | null>(null);

  // Logs
  const [logs, setLogs] = useState<LogItem[]>([]);

  // Notas internas tipo chat
  const [notasLista, setNotasLista] = useState<NotaItem[]>([]);
  const [nuevaNota, setNuevaNota] = useState('');

  // userId
  const [userId, setUserId] = useState<string | null>(null);

  // feedback copiar enlace
  const [copyMsg, setCopyMsg] = useState<string | null>(null);

  // ----------------------------------------------------------
  // Cargar datos iniciales: expediente, logs y notas internas
  // ----------------------------------------------------------
  useEffect(() => {
    const fetchCaseData = async () => {
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

      // Cargar expediente
      const { data: casoData, error: casoError } = await supabase
        .from('casos')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (casoError || !casoData) {
        console.error(casoError);
        setErrorMsg('No se ha encontrado el expediente.');
        setLoading(false);
        return;
      }

      const c = casoData as any;

      const casoNormalizado: Caso = {
        id: c.id,
        titulo: c.titulo ?? 'Expediente sin título',
        estado: c.estado ?? 'en_estudio',
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

      // Logs internos
      const { data: logsData, error: logsError } = await supabase
        .from('expediente_logs')
        .select('id, created_at, tipo, descripcion, visible_cliente')
        .eq('caso_id', c.id)
        .order('created_at', { ascending: false });

      if (!logsError && logsData) {
        setLogs(logsData as LogItem[]);
      }

      // Notas internas
      const { data: notasData, error: notasError } = await supabase
        .from('expediente_notas')
        .select('id, contenido, created_at, user_id')
        .eq('caso_id', c.id)
        .order('created_at', { ascending: true });

      if (!notasError && notasData) {
        setNotasLista(notasData as NotaItem[]);
      }

      setLoading(false);
    };

    if (id) fetchCaseData();
  }, [id]);

  // ----------------------------------------------------------
  // Cargar documentos (desde expediente_documentos)
  // ----------------------------------------------------------
  useEffect(() => {
    const loadDocs = async () => {
      if (!id) return;

      const { data, error } = await supabase
        .from('expediente_documentos')
        .select('id, tipo, nombre_archivo, storage_path, created_at')
        .eq('caso_id', id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error cargando documentos:', error);
        setDocsMsg('No se pudieron cargar los documentos.');
        return;
      }

      setFiles((data as FileItem[]) ?? []);
    };

    loadDocs();
  }, [id]);

  // ----------------------------------------------------------
  // Guardar estado, progreso y nota resumen
  // ----------------------------------------------------------
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
      setErrorMsg('Sesión no válida.');
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

    // Recargar logs del trigger
    const { data: logsData, error: logsError } = await supabase
      .from('expediente_logs')
      .select('id, created_at, tipo, descripcion, visible_cliente')
      .eq('caso_id', caso.id)
      .order('created_at', { ascending: false });

    if (!logsError && logsData) {
      setLogs(logsData as LogItem[]);
    }

    setSaving(false);
  };

  // ----------------------------------------------------------
  // Manejar archivo seleccionado
  // ----------------------------------------------------------
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFileToUpload(f);
    setDocsMsg(null);
  };

  // ----------------------------------------------------------
  // Subir documento (con tipo) + log
  // ----------------------------------------------------------
  const handleUpload = async () => {
    if (!fileToUpload) {
      setDocsMsg('Primero selecciona un archivo.');
      return;
    }
    if (!userId || !caso) {
      setDocsMsg('Sesión no válida.');
      return;
    }

    setUploading(true);
    setDocsMsg(null);

    try {
      // Normalizar nombre
      let safeName = fileToUpload.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/_+/g, '_');

      const path = `${userId}/${caso.id}/${safeName}`;

      // Subir a Storage
      const { error: uploadError } = await supabase.storage
        .from('docs')
        .upload(path, fileToUpload, { upsert: true });

      if (uploadError) {
        console.error('Error subiendo archivo:', uploadError);
        setDocsMsg(
          `No se ha podido subir el documento: ${
            uploadError.message ?? ''
          }`
        );
        setUploading(false);
        return;
      }

      // Insertar metadatos en expediente_documentos
      const { data: docInsert, error: docError } = await supabase
        .from('expediente_documentos')
        .insert({
          caso_id: caso.id,
          user_id: userId,
          tipo: docTipo,
          nombre_archivo: safeName,
          storage_path: path,
        })
        .select('id, tipo, nombre_archivo, storage_path, created_at')
        .single();

      if (docError || !docInsert) {
        console.error('Error guardando metadatos:', docError);
        setDocsMsg(
          'El archivo se subió, pero no se pudieron guardar los metadatos.'
        );
      } else {
        // Añadir a la lista local
        setFiles((prev) => [docInsert as FileItem, ...prev]);
        setDocsMsg('Documento subido correctamente.');
      }

      setFileToUpload(null);

      // Crear log
      const { error: logError } = await supabase.from('expediente_logs').insert({
        caso_id: caso.id,
        user_id: userId,
        tipo: 'documento',
        descripcion: `Documento (${docTipo}) añadido: ${safeName}`,
        visible_cliente: true,
      });

      if (logError) {
        console.error('Error creando log de documento:', logError);
      } else {
        const { data: logsData, error: logsError } = await supabase
          .from('expediente_logs')
          .select('id, created_at, tipo, descripcion, visible_cliente')
          .eq('caso_id', caso.id)
          .order('created_at', { ascending: false });

        if (!logsError && logsData) {
          setLogs(logsData as LogItem[]);
        }
      }
    } catch (e) {
      console.error(e);
      setDocsMsg('Error inesperado subiendo el documento.');
    } finally {
      setUploading(false);
    }
  };

  // ----------------------------------------------------------
  // Descargar documento desde Storage usando storage_path
  // ----------------------------------------------------------
  const handleDownload = async (file: FileItem) => {
    if (!file?.storage_path) return;

    const { data, error } = await supabase.storage
      .from('docs')
      .createSignedUrl(file.storage_path, 60 * 10);

    if (error || !data?.signedUrl) {
      console.error('Error creando signed URL:', error);
      setDocsMsg('No se pudo descargar el documento.');
      return;
    }

    window.open(data.signedUrl, '_blank');
  };

  // ----------------------------------------------------------
  // Añadir nota interna tipo chat
  // ----------------------------------------------------------
  const handleAddNota = async () => {
    if (!nuevaNota.trim() || !caso) return;

    const texto = nuevaNota.trim();
    setNuevaNota('');

    const { error: insertError } = await supabase
      .from('expediente_notas')
      .insert({
        caso_id: caso.id,
        user_id: userId,
        contenido: texto,
      });

    if (insertError) {
      console.error('Error guardando nota:', insertError);
      setErrorMsg('No se pudo guardar la nota interna.');
      return;
    }

    const { data, error } = await supabase
      .from('expediente_notas')
      .select('id, contenido, created_at, user_id')
      .eq('caso_id', caso.id)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setNotasLista(data as NotaItem[]);
    }
  };

  // ----------------------------------------------------------
  // Copiar enlace de seguimiento
  // ----------------------------------------------------------
  const handleCopyLink = async () => {
    if (!caso?.seguimiento_token) return;

    const origin =
      typeof window !== 'undefined'
        ? window.location.origin
        : 'https://backhipotecas.vercel.app';

    const fullUrl = `${origin}/seguimiento/${caso.seguimiento_token}`;

    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopyMsg('Enlace copiado al portapapeles.');
      setTimeout(() => setCopyMsg(null), 2000);
    } catch {
      setCopyMsg('No se pudo copiar el enlace.');
      setTimeout(() => setCopyMsg(null), 2000);
    }
  };

  // ----------------------------------------------------------
  // Render
  // ----------------------------------------------------------
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

  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://backhipotecas.vercel.app';

  const trackingUrl = caso.seguimiento_token
    ? `${origin}/seguimiento/${caso.seguimiento_token}`
    : '';

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
        {/* Mensajes globales */}
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
        {copyMsg && (
          <div className="rounded-md border border-emerald-600 bg-emerald-950/60 px-4 py-2 text-xs text-emerald-100">
            {copyMsg}
          </div>
        )}

        {/* Datos del expediente */}
        <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 space-y-4">
          <h2 className="text-sm font-semibold text-slate-200">
            Estado del expediente
          </h2>

          {/* Estado */}
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

          {/* Progreso */}
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

          {/* Nota resumen */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Nota interna de resumen
            </label>
            <textarea
              rows={4}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="Ej.: FEIN emitida, tasación en curso, pendiente de documentación, etc."
            />
          </div>

          {/* Botones */}
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

        {/* Documentos por tipo */}
        <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 space-y-4">
          <h2 className="text-sm font-semibold text-slate-200">
            Documentación del expediente
          </h2>

          {docsMsg && (
            <div className="rounded-md border border-slate-700 bg-slate-950/70 px-4 py-2 text-xs text-slate-200">
              {docsMsg}
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-3 items-start md:items-end">
            <div className="flex-1 w-full">
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Tipo de documento
              </label>
              <select
                value={docTipo}
                onChange={(e) => setDocTipo(e.target.value)}
                className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {DOC_TIPOS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

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
          </div>

          {/* Tabla de docs */}
          <div className="mt-3 border border-slate-800 rounded-md overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-900/80 text-slate-400">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Tipo</th>
                  <th className="px-3 py-2 text-left font-medium">
                    Nombre del archivo
                  </th>
                  <th className="px-3 py-2 text-left font-medium">
                    Fecha de alta
                  </th>
                  <th className="px-3 py-2 text-left font-medium">Acción</th>
                </tr>
              </thead>
              <tbody>
                {files.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-3 text-center text-slate-500"
                    >
                      Aún no hay documentos subidos.
                    </td>
                  </tr>
                )}

                {files.map((f) => {
                  const tipoLabel =
                    DOC_TIPOS.find((t) => t.value === f.tipo)?.label ||
                    f.tipo;

                  return (
                    <tr
                      key={f.id}
                      className="border-t border-slate-800 hover:bg-slate-900/50"
                    >
                      <td className="px-3 py-2 text-slate-100">
                        {tipoLabel}
                      </td>
                      <td className="px-3 py-2 text-slate-100 break-all">
                        {f.nombre_archivo}
                      </td>
                      <td className="px-3 py-2 text-slate-400">
                        {f.created_at
                          ? new Date(f.created_at).toLocaleString('es-ES')
                          : '-'}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => handleDownload(f)}
                          className="text-emerald-400 hover:underline"
                        >
                          Descargar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Enlace seguimiento */}
        <section className="rounded-lg border border-emerald-700 bg-emerald-950/40 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-emerald-200">
            Enlace de seguimiento para el cliente
          </h2>
          {caso.seguimiento_token ? (
            <>
              <p className="text-xs text-emerald-200/80">
                Copia este enlace o pulsa “Ver como cliente” para verlo tal y
                como lo ve el cliente.
              </p>
              <div className="bg-slate-950 border border-emerald-700/70 rounded-md px-3 py-2 text-xs break-all text-emerald-100">
                {trackingUrl}
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 rounded-md border border-emerald-600 text-xs text-emerald-100 hover:bg-emerald-600/20"
                >
                  Copiar enlace
                </button>
                <Link
                  href={`/seguimiento/${caso.seguimiento_token}`}
                  target="_blank"
                  className="inline-flex items-center rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-medium text-slate-950 shadow-sm hover:bg-emerald-400"
                >
                  Ver como cliente
                </Link>
              </div>
            </>
          ) : (
            <p className="text-xs text-emerald-200/80">
              Aún no hay enlace de seguimiento generado para este expediente.
            </p>
          )}
        </section>

        {/* Historial interno */}
        <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-200">
            Historial del expediente (solo interno)
          </h2>
          <p className="text-xs text-slate-400">
            Aquí se registran automáticamente los cambios de estado, progreso,
            notas y documentación. No es visible para el cliente.
          </p>

          {logs.length === 0 ? (
            <p className="text-xs text-slate-500">
              Aún no hay movimientos registrados para este expediente.
            </p>
          ) : (
            <ul className="space-y-2 text-xs">
              {logs.map((log) => (
                <li
                  key={log.id}
                  className="flex gap-3 border-b border-slate-800 pb-2 last:border-b-0 last:pb-0"
                >
                  <div className="mt-0.5 h-2 w-2 rounded-full bg-emerald-500" />
                  <div>
                    <div className="text-slate-300">
                      {log.descripcion || log.tipo}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {new Date(log.created_at).toLocaleString('es-ES')}{' '}
                      {log.visible_cliente
                        ? '· Visible para cliente'
                        : '· Solo interno'}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Notas internas tipo chat */}
        <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-200">
            Notas internas del gestor
          </h2>
          <p className="text-xs text-slate-400">
            Conversación interna sobre el expediente. Sólo la ves tú y tu
            equipo, nunca el cliente.
          </p>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {notasLista.length === 0 && (
              <p className="text-xs text-slate-500">
                Todavía no hay notas internas.
              </p>
            )}

            {notasLista.map((nota) => (
              <div
                key={nota.id}
                className="rounded-md bg-slate-800/60 px-3 py-2 text-xs text-slate-100"
              >
                <p>{nota.contenido}</p>
                <p className="text-[10px] text-slate-500 mt-1">
                  {new Date(nota.created_at).toLocaleString('es-ES')}
                </p>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            <input
              type="text"
              value={nuevaNota}
              onChange={(e) => setNuevaNota(e.target.value)}
              placeholder="Escribe una nota interna…"
              className="flex-1 rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <button
              type="button"
              onClick={handleAddNota}
              disabled={!nuevaNota.trim()}
              className="px-4 py-2 rounded-md bg-emerald-500 text-xs font-medium text-slate-950 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Añadir nota
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
