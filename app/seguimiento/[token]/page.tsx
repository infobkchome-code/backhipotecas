'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type Caso = {
  id: string;
  titulo: string;
  estado: string;
  progreso: number;
  fecha_limite: string | null;
  updated_at: string;
};

type DocumentoCliente = {
  id: string;
  nombre_archivo: string;
  storage_path: string;
  created_at: string;
  tipo: string | null;
};

type LogItem = {
  id: string;
  created_at: string;
  tipo: string;
  descripcion: string | null;
};

export default function SeguimientoPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;

  const [loading, setLoading] = useState(true);
  const [caso, setCaso] = useState<Caso | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Checklist del expediente (lo que el cliente debe enviar)
  const [checklist, setChecklist] = useState<any[]>([]);
  const [loadingChecklist, setLoadingChecklist] = useState(true);
  const [docToUpload, setDocToUpload] = useState<any | null>(null);

  // Subida de documentos por el cliente
  const [uploadingCliente, setUploadingCliente] = useState(false);
  const [fileCliente, setFileCliente] = useState<File | null>(null);
  const [uploadMsgCliente, setUploadMsgCliente] = useState<string | null>(null);

  // Documentos ya enviados por el cliente
  const [docsCliente, setDocsCliente] = useState<DocumentoCliente[]>([]);
  const [loadingDocsCliente, setLoadingDocsCliente] = useState(true);

  // Historial visible para el cliente
  const [logsCliente, setLogsCliente] = useState<LogItem[]>([]);
  const [loadingLogsCliente, setLoadingLogsCliente] = useState(true);

  // ============================
  // Cargar expediente por token
  // ============================
  useEffect(() => {
    const load = async () => {
      if (!token) return;

      const { data, error } = await supabase
        .from('casos')
        .select('id, titulo, estado, progreso, fecha_limite, updated_at')
        .eq('seguimiento_token', token)
        .single();

      if (error || !data) {
        setErrorMsg('Enlace de seguimiento no válido.');
        setLoading(false);
        return;
      }

      setCaso(data as Caso);
      setLoading(false);
    };

    load();
  }, [token]);

  // ============================
  // Cargar checklist del caso
  // ============================
  useEffect(() => {
    const loadChecklist = async () => {
      if (!caso) return;

      setLoadingChecklist(true);

      const { data, error } = await supabase
        .from('casos_documentos_requeridos')
        .select(`
          id,
          completado,
          completado_en,
          doc:documentos_requeridos (
            id,
            tipo,
            descripcion,
            obligatorio,
            orden
          )
        `)
        .eq('caso_id', caso.id)
        .order('id', { ascending: true });

      if (!error && data) {
        setChecklist(data);
      }

      setLoadingChecklist(false);
    };

    loadChecklist();
  }, [caso]);

  // ============================
  // Cargar documentos subidos por el cliente
  // ============================
  useEffect(() => {
    const loadDocsCliente = async () => {
      if (!caso) return;

      setLoadingDocsCliente(true);

      const { data, error } = await supabase
        .from('expediente_documentos')
        .select('id, nombre_archivo, storage_path, created_at, tipo')
        .eq('caso_id', caso.id)
        .is('user_id', null) // user_id null = subido por el cliente
        .order('created_at', { ascending: false });

      if (!error && data) {
        setDocsCliente(data as DocumentoCliente[]);
      }

      setLoadingDocsCliente(false);
    };

    loadDocsCliente();
  }, [caso]);

  // ============================
  // Cargar historial visible cliente
  // ============================
  useEffect(() => {
    const loadLogsCliente = async () => {
      if (!caso) return;

      setLoadingLogsCliente(true);

      const { data, error } = await supabase
        .from('expediente_logs')
        .select('id, created_at, tipo, descripcion')
        .eq('caso_id', caso.id)
        .eq('visible_cliente', true)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setLogsCliente(data as LogItem[]);
      }

      setLoadingLogsCliente(false);
    };

    loadLogsCliente();
  }, [caso]);

  // ===============================================
  // SUBIDA DE DOCUMENTO POR EL CLIENTE
  // ===============================================
  const handleUploadCliente = async () => {
    if (!fileCliente || !docToUpload || !caso) return;

    setUploadingCliente(true);
    setUploadMsgCliente(null);

    try {
      // Sanitizar nombre
      let safeName = fileCliente.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/_+/g, '_');

      // Ruta en storage
      const path = `cliente/${caso.id}/${safeName}`;

      // Subir archivo
      const { error: uploadError } = await supabase.storage
        .from('docs')
        .upload(path, fileCliente, { upsert: true });

      if (uploadError) {
        console.error(uploadError);
        setUploadMsgCliente('No se pudo subir el archivo.');
        setUploadingCliente(false);
        return;
      }

      // Registrar metadatos del documento
      await supabase.from('expediente_documentos').insert({
        caso_id: caso.id,
        user_id: null, // cliente
        tipo: docToUpload.doc?.tipo ?? 'otros',
        nombre_archivo: safeName,
        storage_path: path,
      });

      // Marcar checklist como completado
      await supabase
        .from('casos_documentos_requeridos')
        .update({
          completado: true,
          completado_en: new Date().toISOString(),
        })
        .eq('id', docToUpload.id);

      // Crear log visible para cliente
      await supabase.from('expediente_logs').insert({
        caso_id: caso.id,
        tipo: 'documento_cliente',
        descripcion: `Has subido: ${safeName}`,
        visible_cliente: true,
      });

      // Recargar checklist
      const { data: checklistData } = await supabase
        .from('casos_documentos_requeridos')
        .select(`
          id,
          completado,
          completado_en,
          doc:documentos_requeridos (
            id,
            tipo,
            descripcion,
            obligatorio,
            orden
          )
        `)
        .eq('caso_id', caso.id);

      if (checklistData) {
        setChecklist(checklistData);
      }

      // Recargar docs del cliente
      const { data: docsData } = await supabase
        .from('expediente_documentos')
        .select('id, nombre_archivo, storage_path, created_at, tipo')
        .eq('caso_id', caso.id)
        .is('user_id', null)
        .order('created_at', { ascending: false });

      if (docsData) {
        setDocsCliente(docsData as DocumentoCliente[]);
      }

    setUploadMsgCliente('Documento subido correctamente.');

// 🔥 1. Volvemos a cargar checklist y docs antes de cerrar el modal
await Promise.all([
  (async () => {
    const { data: checklistData } = await supabase
      .from('casos_documentos_requeridos')
      .select(`
        id,
        completado,
        completado_en,
        doc:documentos_requeridos (
          id,
          tipo,
          descripcion,
          obligatorio,
          orden
        )
      `)
      .eq('caso_id', caso.id);

    if (checklistData) setChecklist(checklistData);
  })(),

  (async () => {
    const { data: docsData } = await supabase
      .from('expediente_documentos')
      .select('id, nombre_archivo, storage_path, created_at, tipo')
      .eq('caso_id', caso.id)
      .is('user_id', null)
      .order('created_at', { ascending: false });

    if (docsData) setDocsCliente(docsData);
  })(),
]);

// 🔥 2. Ahora sí cerramos el modal
setTimeout(() => {
  setDocToUpload(null);
  setFileCliente(null);
  setUploadMsgCliente(null);
}, 800);

    } catch (e) {
      console.error(e);
      setUploadMsgCliente('Error inesperado.');
    }

    setUploadingCliente(false);
  };

  // Descargar documento subido por cliente
  const handleDownloadClienteDoc = async (doc: DocumentoCliente) => {
    const { data, error } = await supabase.storage
      .from('docs')
      .createSignedUrl(doc.storage_path, 60 * 10);

    if (error || !data?.signedUrl) {
      console.error('Error creando URL de descarga', error);
      return;
    }

    window.open(data.signedUrl, '_blank');
  };

  // ============================
  // RENDER
  // ============================
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-300">Cargando expediente…</p>
      </div>
    );
  }

  if (errorMsg || !caso) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
        <div className="border border-red-700 bg-red-900/40 px-4 py-3 rounded-md max-w-md text-center space-y-2">
          <h1 className="text-sm font-semibold">
            Enlace de seguimiento no válido
          </h1>
          <p className="text-xs text-red-100">
            {errorMsg || 'No hemos encontrado ningún expediente asociado a este enlace.'}
          </p>
        </div>
      </div>
    );
  }

  // Texto de fecha límite, si existe
  let fechaLimiteTexto: string | null = null;
  if (caso.fecha_limite) {
    fechaLimiteTexto = new Date(caso.fecha_limite).toLocaleDateString('es-ES');
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-6">
      {/* HEADER */}
      <header className="max-w-3xl mx-auto mb-6">
        <p className="text-xs uppercase tracking-wide text-emerald-400 mb-1">
          Seguimiento de expediente hipotecario
        </p>
        <h1 className="text-xl font-semibold">{caso.titulo}</h1>
        <p className="text-[11px] text-slate-400 mt-1">
          Aquí puedes ver el estado de tu expediente y la documentación necesaria.
        </p>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-3xl mx-auto space-y-6">
        {/* =============================
            BLOQUE 2 – ESTADO Y PROGRESO
           ============================= */}
        <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-5 space-y-4">
          {/* Estado actual */}
          <div>
            <p className="text-xs text-slate-400 mb-1">Estado actual</p>

            <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300 border border-emerald-700/40">
              {{
                en_estudio: 'En estudio',
                tasacion: 'Tasación',
                fein: 'FEIN / Oferta',
                notaria: 'Notaría',
                compraventa: 'Firma compraventa',
                fin: 'Expediente finalizado',
                denegado: 'Denegado',
              }[caso.estado] ?? 'En curso'}
            </span>
          </div>

          {/* Progreso */}
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

          {/* Fecha límite (si existe) */}
          {fechaLimiteTexto && (
            <div className="mt-2">
              <p className="text-xs text-slate-400 mb-1">
                Fecha estimada de gestión
              </p>
              <p className="text-sm text-amber-300">{fechaLimiteTexto}</p>
            </div>
          )}
        </section>

        {/* =========================================
            BLOQUE 3 — CHECKLIST PARA EL CLIENTE
           ========================================= */}
        <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-200">
            Documentación necesaria
          </h2>

          <p className="text-xs text-slate-400 mb-2">
            Estos son los documentos que necesitamos para continuar con tu estudio hipotecario.
          </p>

          {loadingChecklist && (
            <p className="text-xs text-slate-400">Cargando documentos…</p>
          )}

          {!loadingChecklist && checklist.length === 0 && (
            <p className="text-xs text-slate-500">
              No se ha asignado documentación a este expediente.
            </p>
          )}

          {!loadingChecklist && checklist.length > 0 && (
            <div className="flex flex-col gap-3">
              {checklist.map((item) => {
                const obligatorio = item.doc?.obligatorio ?? false;

                return (
                  <div
                    key={item.id}
                    className="rounded-md p-3 border border-slate-700 bg-slate-950/40"
                  >
                    <div className="flex justify-between items-center">
                      <p className="text-slate-100 text-sm font-medium">
                        {item.doc?.descripcion ||
                          item.doc?.tipo?.replace('_', ' ') ||
                          'Documento'}
                      </p>

                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-md border ${
                          item.completado
                            ? 'border-emerald-500 text-emerald-300 bg-emerald-700/10'
                            : 'border-amber-400 text-amber-200 bg-amber-700/10'
                        }`}
                      >
                        {item.completado ? 'Completado' : 'Pendiente'}
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-400 mt-1">
                      {obligatorio ? 'Obligatorio' : 'Opcional'}
                    </p>

                    {item.completado_en && (
                      <p className="text-[10px] text-slate-500 mt-1">
                        Subido el{' '}
                        {new Date(
                          item.completado_en
                        ).toLocaleDateString('es-ES')}
                      </p>
                    )}

                    {!item.completado && (
                      <div className="mt-3">
                        <button
                          onClick={() => setDocToUpload(item)}
                          className="text-xs px-3 py-1.5 rounded-md bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                        >
                          Subir documento
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* =============================
            BLOQUE 5 — DOCUMENTOS ENVIADOS
           ============================= */}
        <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-200">
            Tus documentos enviados
          </h2>

          {loadingDocsCliente && (
            <p className="text-xs text-slate-400">Cargando documentos…</p>
          )}

          {!loadingDocsCliente && docsCliente.length === 0 && (
            <p className="text-xs text-slate-500">
              Todavía no has subido ningún documento desde este enlace.
            </p>
          )}

          {!loadingDocsCliente && docsCliente.length > 0 && (
            <div className="space-y-2">
              {docsCliente.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between rounded-md border border-slate-700 bg-slate-950/40 px-3 py-2 text-xs"
                >
                  <div>
                    <p className="text-slate-100 break-all">
                      {doc.nombre_archivo}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Subido el{' '}
                      {new Date(doc.created_at).toLocaleString('es-ES')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownloadClienteDoc(doc)}
                    className="text-emerald-400 hover:text-emerald-300"
                  >
                    Ver / descargar
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* =============================
            BLOQUE 5 — HISTORIAL CLIENTE
           ============================= */}
        <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-200">
            Historial de tu expediente
          </h2>
          <p className="text-xs text-slate-400">
            Aquí verás los principales hitos y comentarios que tu gestor ha marcado como visibles.
          </p>

          {loadingLogsCliente && (
            <p className="text-xs text-slate-400">Cargando historial…</p>
          )}

          {!loadingLogsCliente && logsCliente.length === 0 && (
            <p className="text-xs text-slate-500">
              Aún no hay movimientos registrados visibles para este expediente.
            </p>
          )}

          {!loadingLogsCliente && logsCliente.length > 0 && (
            <ul className="space-y-2 text-xs">
              {logsCliente.map((log) => (
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
                      {new Date(log.created_at).toLocaleString('es-ES')}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="text-[11px] text-slate-500 pt-2 pb-6">
          Última actualización:{' '}
          {new Date(caso.updated_at).toLocaleString('es-ES')}
        </footer>
      </main>

      {/* MODAL SUBIDA CLIENTE */}
      {docToUpload && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold text-slate-100">
              Subir documento
            </h2>

            <p className="text-xs text-slate-400">
              Documento requerido:{' '}
              <span className="text-slate-200 font-medium">
                {docToUpload.doc?.descripcion ||
                  docToUpload.doc?.tipo ||
                  'Documento'}
              </span>
            </p>

            <input
              type="file"
              onChange={(e) =>
                setFileCliente(e.target.files?.[0] ?? null)
              }
              className="w-full text-xs text-slate-300"
            />

            {uploadMsgCliente && (
              <p className="text-xs text-emerald-300">
                {uploadMsgCliente}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setDocToUpload(null);
                  setFileCliente(null);
                  setUploadMsgCliente(null);
                }}
                className="px-3 py-1.5 rounded-md border border-slate-600 text-slate-300 text-xs hover:bg-slate-800"
              >
                Cancelar
              </button>

              <button
                disabled={!fileCliente || uploadingCliente}
                onClick={handleUploadCliente}
                className="px-4 py-1.5 rounded-md bg-emerald-500 text-slate-900 text-xs font-medium hover:bg-emerald-400 disabled:opacity-40"
              >
                {uploadingCliente ? 'Subiendo…' : 'Subir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
