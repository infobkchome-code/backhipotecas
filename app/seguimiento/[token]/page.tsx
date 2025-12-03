'use client';

import { useEffect, useState, ChangeEvent } from 'react';
import { useParams } from 'next/navigation';

// -------------------- TIPOS --------------------
type SeguimientoCaso = {
  id: string;
  titulo: string;
  estado: string;
  progreso: number;
  notas: string | null;
  created_at: string;
  updated_at: string;
};

type LogItem = {
  id: string;
  created_at: string;
  tipo: string;
  descripcion: string | null;
};

type MensajeChat = {
  id: string;
  caso_id: string;
  remitente: 'gestor' | 'cliente';
  mensaje: string | null;
  created_at: string;
  attachment_name?: string | null;
  attachment_path?: string | null;
  storage_path?: string | null;
};

type ClienteDoc = {
  id: string;
  titulo: string;
  obligatorio: boolean;
  ya_subido: boolean;
};

type ApiSeguimientoResponse = {
  data?: SeguimientoCaso;
  logs?: LogItem[];
  docs?: ClienteDoc[];
  error?: string;
};

type ApiChatResponse = {
  ok?: boolean;
  mensajes?: MensajeChat[];
  mensaje?: MensajeChat;
  error?: string;
};

// -------------------- CONSTANTES --------------------
const ESTADO_LABEL: Record<string, string> = {
  en_estudio: 'En estudio',
  tasacion: 'Tasación',
  fein: 'FEIN / Oferta',
  notaria: 'Notaría',
  compraventa: 'Firma compraventa',
  fin: 'Expediente finalizado',
  denegado: 'Denegado',
};

// -----------------------------------------------------
//                P Á G I N A   P R I N C I P A L
// -----------------------------------------------------

export default function SeguimientoPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;

  const [caso, setCaso] = useState<SeguimientoCaso | null>(null);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [docs, setDocs] = useState<ClienteDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // CHAT
  const [mensajes, setMensajes] = useState<MensajeChat[]>([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  // DOCUMENTOS
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadOk, setUploadOk] = useState<string | null>(null);

  // 🔒 control local: qué documentos ya se han subido en esta sesión
  const [uploadedDocsLocal, setUploadedDocsLocal] = useState<Record<string, boolean>>({});

  // ---------------- ESTILOS BASE (visual portal) ----------------
  const pageWrap = 'min-h-screen bg-slate-100 text-slate-900';
  const container = 'max-w-4xl mx-auto px-6 py-10 space-y-6';
  const card = 'bg-white border border-slate-200 rounded-2xl shadow-sm p-5';
  const cardTitle = 'text-sm font-semibold text-slate-900';
  const muted = 'text-slate-600';
  const subtle = 'text-slate-500';

  // -------------- CARGAR DATOS DEL CASO + DOCS ----------------
  useEffect(() => {
    if (!token) return;

    const loadData = async () => {
      setLoading(true);
      setErrorMsg(null);

      try {
        const res = await fetch(`/api/seguimiento/${token}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
        });

        const json: ApiSeguimientoResponse = await res.json();

        if (!res.ok || !json.data) {
          setErrorMsg('No hemos encontrado ningún expediente asociado a este enlace.');
          setLoading(false);
          return;
        }

        setCaso(json.data);
        setLogs(json.logs ?? []);
        setDocs(json.docs ?? []);
      } catch {
        setErrorMsg('Error inesperado al cargar el expediente.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [token]);

  // ------------------- CARGAR CHAT ---------------------
  const loadChat = async () => {
    if (!token) return;

    try {
      const res = await fetch(`/api/seguimiento/chat/${token}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      });

      const json: ApiChatResponse = await res.json();
      if (json.mensajes) setMensajes(json.mensajes);
    } catch (e) {
      console.error('Error cargando chat:', e);
    }
  };

  useEffect(() => {
    loadChat();
    const interval = setInterval(loadChat, 10000);
    return () => clearInterval(interval);
  }, [token]);

  // ----------------- ENVIAR MENSAJE --------------------
  const handleSendMessage = async () => {
    if (!nuevoMensaje.trim() || !token) return;

    setEnviando(true);
    setChatError(null);

    try {
      const res = await fetch(`/api/seguimiento/chat/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje: nuevoMensaje.trim() }),
      });

      const json: ApiChatResponse = await res.json();

      if (!json.ok || !json.mensaje) {
        setChatError('Error enviando tu mensaje.');
        return;
      }

      setMensajes((prev) => [...prev, json.mensaje]);
      setNuevoMensaje('');
    } catch {
      setChatError('Error enviando tu mensaje.');
    } finally {
      setEnviando(false);
    }
  };

  // ------------- SUBIDA DE DOCUMENTOS ------------------
  const handleDocFileChange =
    (doc: ClienteDoc) => async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !token) return;

      setUploadingDocId(doc.id);
      setUploadError(null);
      setUploadOk(null);

      try {
        const form = new FormData();
        form.append('file', file);
        // ⚠️ Importante: aquí usamos el ID del registro de casos_documentos_requeridos
        form.append('docId', doc.id);

        const res = await fetch(`/api/seguimiento/upload/${token}`, {
          method: 'POST',
          body: form,
        });

        const json = await res.json();

        if (!res.ok || !json.ok) {
          setUploadError(json.error || 'No se ha podido subir el archivo.');
          setUploadingDocId(null);
          e.target.value = '';
          return;
        }

        if (json.mensaje) {
          setMensajes((prev) => [...prev, json.mensaje]);
        }

        setUploadedDocsLocal((prev) => ({ ...prev, [doc.id]: true }));

        setDocs((prev) => prev.map((d) => (d.id === doc.id ? { ...d, ya_subido: true } : d)));

        setUploadOk(`Se ha subido correctamente: "${doc.titulo}".`);
        setTimeout(() => setUploadOk(null), 4000);
      } catch {
        setUploadError('No se ha podido subir el archivo.');
      } finally {
        setUploadingDocId(null);
        e.target.value = '';
      }
    };

  // ------------------ RENDER ---------------------------
  if (loading) {
    return (
      <div className={`${pageWrap} flex items-center justify-center`}>
        <div className="text-sm text-slate-600">Cargando expediente…</div>
      </div>
    );
  }

  if (errorMsg || !caso) {
    return (
      <div className={`${pageWrap} flex items-center justify-center`}>
        <div className="text-center space-y-2 px-4">
          <h1 className="text-lg font-semibold text-slate-900">Enlace de seguimiento no válido</h1>
          <p className="text-sm text-slate-600">{errorMsg}</p>
        </div>
      </div>
    );
  }

  const estadoLabel = ESTADO_LABEL[caso.estado] ?? 'En curso';

  return (
    <div className={pageWrap}>
      <main className={container}>
        {/* ---------------- CABECERA ---------------- */}
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
            Seguimiento de expediente hipotecario
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">{caso.titulo}</h1>
          <p className="text-xs text-slate-500">
            Creado el {new Date(caso.created_at).toLocaleDateString('es-ES')}
          </p>
        </header>

        {/* ---------------- ESTADO ---------------- */}
        <section className={`${card} space-y-4`}>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <p className={`text-xs ${subtle} mb-1`}>Estado actual</p>
              <span className="inline-flex items-center bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1 rounded-full text-xs font-medium">
                {estadoLabel}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 sm:text-right">
              Última actualización: {new Date(caso.updated_at).toLocaleString('es-ES')}
            </p>
          </div>

          <div className="space-y-2">
            <p className={`text-xs ${subtle}`}>Avance aproximado del expediente</p>
            <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-2 bg-emerald-600 transition-all"
                style={{ width: `${caso.progreso}%` }}
              />
            </div>
            <p className="text-xs text-slate-700">{caso.progreso}% completado</p>
          </div>

          {caso.notas && (
            <div className="pt-2 border-t border-slate-200">
              <p className={`text-xs ${subtle} mb-1`}>Comentarios de tu gestor</p>
              <p className="text-sm text-slate-900 whitespace-pre-wrap">{caso.notas}</p>
            </div>
          )}
        </section>

        {/* --------------- SUBIDA DOCUMENTOS ---------------- */}
        <section className={`${card} space-y-3`}>
          <h2 className={cardTitle}>Documentación para el estudio</h2>

          {docs.length === 0 && (
            <p className={`text-xs ${subtle}`}>
              De momento no hay documentación que tengas que subir por aquí.
            </p>
          )}

          {docs.length > 0 && (
            <>
              <p className={`text-xs ${muted}`}>
                Sube aquí la documentación necesaria para tu hipoteca. Cada tipo de documento solo se puede
                enviar una vez.
              </p>

              {uploadError && (
                <div className="text-red-700 text-xs bg-red-50 p-3 rounded-xl border border-red-200">
                  {uploadError}
                </div>
              )}

              {uploadOk && (
                <div className="text-emerald-700 text-xs bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                  {uploadOk}
                </div>
              )}

              <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
                {docs.map((doc) => {
                  const yaSubido = doc.ya_subido || uploadedDocsLocal[doc.id];
                  const disabled = uploadingDocId === doc.id || yaSubido;

                  return (
                    <div key={doc.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs font-medium text-slate-900">{doc.titulo}</p>

                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full border ${
                              doc.obligatorio
                                ? 'border-amber-200 text-amber-700 bg-amber-50'
                                : 'border-slate-200 text-slate-600 bg-slate-50'
                            }`}
                          >
                            {doc.obligatorio ? 'Obligatorio' : 'Opcional'}
                          </span>

                          {yaSubido && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full border border-emerald-200 text-emerald-700 bg-emerald-50">
                              Enviado
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-500 mt-1">
                          {yaSubido ? 'Ya hemos recibido este documento.' : 'Formato PDF o imagen.'}
                        </p>
                      </div>

                      <label className="sm:w-44 inline-flex items-center justify-end text-[11px]">
                        <span
                          className={`px-3 py-2 rounded-lg border text-xs font-medium transition select-none ${
                            disabled
                              ? 'border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed'
                              : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 cursor-pointer'
                          }`}
                        >
                          {yaSubido ? 'Enviado' : uploadingDocId === doc.id ? 'Subiendo…' : 'Subir archivo'}
                        </span>
                        <input
                          type="file"
                          className="hidden"
                          onChange={handleDocFileChange(doc)}
                          disabled={disabled}
                        />
                      </label>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>

        {/* ---------------- TIMELINE ---------------- */}
        <section className={`${card} space-y-3`}>
          <div className="space-y-1">
            <h2 className={cardTitle}>Historial del expediente</h2>
            <p className={`text-xs ${muted}`}>Cambios de estado, avance y documentación añadida.</p>
          </div>

          {logs.length === 0 ? (
            <p className={`text-xs ${subtle}`}>Aún no hay movimientos registrados.</p>
          ) : (
            <ul className="space-y-3 text-xs">
              {logs.map((log) => (
                <li key={log.id} className="flex gap-3">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-600 mt-1" />
                  <div className="flex-1 border-b border-slate-200 pb-3 last:border-b-0 last:pb-0">
                    <p className="text-slate-800">{log.descripcion || log.tipo}</p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {new Date(log.created_at).toLocaleString('es-ES')}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ---------------- CHAT ---------------- */}
        <section className={`${card} space-y-3`}>
          <div className="flex items-center justify-between gap-3">
            <h2 className={cardTitle}>Chat con tu gestor</h2>
            <span className="text-[11px] text-slate-500">Respuesta en el mismo enlace</span>
          </div>

          <div className="max-h-64 overflow-y-auto space-y-2 bg-slate-50 border border-slate-200 rounded-2xl p-3">
            {mensajes.length === 0 && (
              <p className="text-xs text-slate-500">No hay mensajes todavía.</p>
            )}

            {mensajes.map((m) => {
              const esCliente = m.remitente === 'cliente';
              return (
                <div key={m.id} className={`flex ${esCliente ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[84%] rounded-2xl px-3 py-2 text-xs space-y-1 ${
                      esCliente
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-900'
                    }`}
                  >
                    {m.attachment_name && m.attachment_path && (
                      <a
                        href={m.attachment_path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`underline text-[11px] ${
                          esCliente ? 'decoration-white/60' : 'decoration-slate-300'
                        }`}
                      >
                        📎 {m.attachment_name}
                      </a>
                    )}

                    {m.mensaje && <p>{m.mensaje}</p>}

                    <p className="text-[10px] opacity-70">
                      {new Date(m.created_at).toLocaleString('es-ES')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {chatError && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-2xl text-[11px]">
              {chatError}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <input
              type="text"
              value={nuevoMensaje}
              onChange={(e) => setNuevoMensaje(e.target.value)}
              placeholder="Escribe tu mensaje…"
              className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              onClick={handleSendMessage}
              disabled={!nuevoMensaje.trim() || enviando}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-700"
            >
              {enviando ? 'Enviando…' : 'Enviar'}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
