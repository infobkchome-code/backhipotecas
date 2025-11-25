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

type ApiSeguimientoResponse = {
  data?: SeguimientoCaso;
  logs?: LogItem[];
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

type DocItem = {
  id: string;
  titulo: string;
  obligatorio: boolean;
};

const DOC_ITEMS: DocItem[] = [
  { id: 'dni_comprador', titulo: 'DNI/NIE de comprador(es)', obligatorio: true },
  { id: 'dni_cliente', titulo: 'DNI/NIE del cliente', obligatorio: true },
  { id: 'nominas_3m', titulo: 'Nóminas de los últimos 3 meses', obligatorio: true },
  { id: 'contrato_trabajo', titulo: 'Contrato de trabajo', obligatorio: true },
  { id: 'vida_laboral', titulo: 'Informe de vida laboral', obligatorio: true },
  { id: 'renta', titulo: 'Declaración de la renta', obligatorio: true },
  {
    id: 'extractos_6m',
    titulo: 'Extractos bancarios últimos 6 meses',
    obligatorio: false,
  },
  {
    id: 'extractos_3_6m',
    titulo: 'Extractos bancarios 3–6 meses',
    obligatorio: false,
  },
];

const DOC_LABELS: Record<string, string> = DOC_ITEMS.reduce(
  (acc, d) => ({ ...acc, [d.id]: d.titulo }),
  {} as Record<string, string>
);

// -----------------------------------------------------
//                P Á G I N A   P R I N C I P A L
// -----------------------------------------------------

export default function SeguimientoPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;

  const [caso, setCaso] = useState<SeguimientoCaso | null>(null);
  const [logs, setLogs] = useState<LogItem[]>([]);
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
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, boolean>>({});

  // -------------- CARGAR DATOS DEL CASO ----------------
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
          setErrorMsg(
            'No hemos encontrado ningún expediente asociado a este enlace.'
          );
          setLoading(false);
          return;
        }

        setCaso(json.data);
        setLogs(json.logs ?? []);
      } catch (err) {
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

  // ------------- SUBIDA DE DOCUMENTOS (NUEVO) ----------
  const handleDocFileChange =
    (docId: string) => async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !token) return;

      setUploadingDocId(docId);
      setUploadError(null);
      setUploadOk(null);

      try {
        const form = new FormData();
        form.append('file', file);
        form.append('docId', docId);

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

        // ✅ Marcamos este tipo de documento como YA SUBIDO
        setUploadedDocs((prev) => ({
          ...prev,
          [docId]: true,
        }));

        setUploadOk(`Se ha subido correctamente: "${DOC_LABELS[docId]}".`);
        setTimeout(() => setUploadOk(null), 4000);
      } catch (err) {
        setUploadError('No se ha podido subir el archivo.');
      } finally {
        setUploadingDocId(null);
        e.target.value = '';
      }
    };

  // ------------------ RENDER ---------------------------
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        Cargando expediente…
      </div>
    );
  }

  if (errorMsg || !caso) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3 px-4">
          <h1 className="text-lg font-semibold">Enlace de seguimiento no válido</h1>
          <p className="text-sm text-slate-400">{errorMsg}</p>
        </div>
      </div>
    );
  }

  const estadoLabel = ESTADO_LABEL[caso.estado] ?? 'En curso';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <main className="max-w-2xl mx-auto px-6 py-10 space-y-6">
        {/* ---------------- CABECERA ---------------- */}
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-emerald-400">
            Seguimiento de expediente hipotecario
          </p>
          <h1 className="text-2xl font-semibold">{caso.titulo}</h1>
          <p className="text-xs text-slate-400">
            Creado el {new Date(caso.created_at).toLocaleDateString('es-ES')}
          </p>
        </header>

        {/* ---------------- ESTADO ---------------- */}
        <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 space-y-4">
          <div className="flex justify-between gap-3">
            <div>
              <p className="text-xs text-slate-400 mb-1">Estado actual</p>
              <span className="bg-emerald-500/10 text-emerald-300 px-3 py-1 rounded-full text-xs">
                {estadoLabel}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 text-right">
              Última actualización:{' '}
              {new Date(caso.updated_at).toLocaleString('es-ES')}
            </p>
          </div>

          <p className="text-xs text-slate-400 mb-1">
            Avance aproximado del expediente
          </p>
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-2 bg-emerald-500 transition-all"
              style={{ width: `${caso.progreso}%` }}
            />
          </div>
          <p className="text-xs text-slate-300 mt-1">
            {caso.progreso}% completado
          </p>

          {caso.notas && (
            <div className="mt-2">
              <p className="text-xs text-slate-400 mb-1">
                Comentarios de tu gestor
              </p>
              <p className="text-sm text-slate-100 whitespace-pre-wrap">
                {caso.notas}
              </p>
            </div>
          )}
        </section>

        {/* --------------- SUBIDA DOCUMENTOS ---------------- */}
        <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-200">
            Documentación para el estudio
          </h2>
          <p className="text-xs text-slate-400">
            Sube aquí la documentación necesaria para tu hipoteca. Cada tipo de
            documento solo se puede enviar una vez.
          </p>

          {uploadError && (
            <div className="text-red-200 text-xs bg-red-900/40 p-2 rounded-md border border-red-700">
              {uploadError}
            </div>
          )}

          {uploadOk && (
            <div className="text-emerald-200 text-xs bg-emerald-900/40 p-2 rounded-md border border-emerald-700">
              {uploadOk}
            </div>
          )}

          <div className="divide-y divide-slate-800 rounded-md border border-slate-800 bg-slate-950/40">
            {DOC_ITEMS.map((doc) => {
              const yaSubido = uploadedDocs[doc.id] === true;
              const disabled = uploadingDocId === doc.id || yaSubido;

              return (
                <div
                  key={doc.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 px-3 py-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-medium text-slate-100">
                        {doc.titulo}
                      </p>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border ${
                          doc.obligatorio
                            ? 'border-amber-500 text-amber-300 bg-amber-500/10'
                            : 'border-slate-500 text-slate-300 bg-slate-800/60'
                        }`}
                      >
                        {doc.obligatorio ? 'Obligatorio' : 'Opcional'}
                      </span>
                      {yaSubido && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full border border-emerald-500 text-emerald-200 bg-emerald-600/10">
                          Enviado
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {yaSubido
                        ? 'Ya hemos recibido este documento.'
                        : 'Formato PDF o imagen. Tamaño máximo según tu correo.'}
                    </p>
                  </div>

                  <label className="sm:w-40 inline-flex items-center text-[11px] cursor-pointer justify-end">
                    <span
                      className={`px-3 py-1 rounded-md border text-xs transition ${
                        disabled
                          ? 'border-slate-600 text-slate-500 bg-slate-800 cursor-not-allowed'
                          : 'border-emerald-600 text-emerald-100 bg-emerald-900/40 hover:bg-emerald-800'
                      }`}
                    >
                      {yaSubido
                        ? 'Enviado'
                        : uploadingDocId === doc.id
                        ? 'Subiendo…'
                        : 'Subir archivo'}
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleDocFileChange(doc.id)}
                      disabled={disabled}
                    />
                  </label>
                </div>
              );
            })}
          </div>
        </section>

        {/* ---------------- TIMELINE ---------------- */}
        <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-200">
            Historial del expediente
          </h2>
          <p className="text-xs text-slate-400">
            Cambios de estado, avance y documentación añadida.
          </p>

          {logs.length === 0 ? (
            <p className="text-xs text-slate-500">
              Aún no hay movimientos registrados.
            </p>
          ) : (
            <ul className="space-y-2 text-xs">
              {logs.map((log) => (
                <li
                  key={log.id}
                  className="flex gap-3 border-b border-slate-800 pb-2 last:border-b-0 last:pb-0"
                >
                  <div className="h-2 w-2 rounded-full bg-emerald-500 mt-0.5" />
                  <div>
                    <p className="text-slate-300">
                      {log.descripcion || log.tipo}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {new Date(log.created_at).toLocaleString('es-ES')}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ---------------- CHAT ---------------- */}
        <section className="rounded-lg border border-emerald-700 bg-emerald-950/30 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-emerald-100">
            Chat con tu gestor
          </h2>

          <div className="max-h-64 overflow-y-auto space-y-2 bg-slate-950/40 rounded-md p-2">
            {mensajes.length === 0 && (
              <p className="text-xs text-slate-500">
                No hay mensajes todavía.
              </p>
            )}

            {mensajes.map((m) => {
              const esCliente = m.remitente === 'cliente';

              return (
                <div
                  key={m.id}
                  className={`flex ${
                    esCliente ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-xs space-y-1 ${
                      esCliente
                        ? 'bg-emerald-600 text-slate-950'
                        : 'bg-slate-800 text-white'
                    }`}
                  >
                    {m.attachment_name && m.attachment_path && (
                      <a
                        href={m.attachment_path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline decoration-emerald-200 text-[11px]"
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
            <div className="bg-red-900/40 border border-red-600 text-red-100 p-2 rounded-md text-[11px]">
              {chatError}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <input
              type="text"
              value={nuevoMensaje}
              onChange={(e) => setNuevoMensaje(e.target.value)}
              placeholder="Escribe tu mensaje…"
              className="flex-1 rounded-md bg-slate-950 border border-emerald-700 px-3 py-2 text-xs text-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <button
              onClick={handleSendMessage}
              disabled={!nuevoMensaje.trim() || enviando}
              className="px-4 py-2 bg-emerald-500 text-slate-950 rounded-md text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-400"
            >
              {enviando ? 'Enviando…' : 'Enviar'}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
