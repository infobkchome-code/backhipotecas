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
  { id: 'extractos_6m', titulo: 'Extractos bancarios últimos 6 meses', obligatorio: false },
  { id: 'extractos_3_6m', titulo: 'Extractos bancarios 3–6 meses', obligatorio: false },
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
          <div className="flex justify-between">
            <div>
              <p className="text-xs text-slate-400 mb-1">Estado actual</p>
              <span className="bg-emerald-500/10 text-emerald-300 px-3 py-1 rounded-full text-xs">
                {estadoLabel}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Última actualización: {new Date(caso.updated_at).toLocaleString('es-ES')}
            </p>
          </div>

          <p className="text-xs text-slate-400 mb-1">
            Avance aproximado del expediente
          </p>
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-2 bg-emerald-500"
              style={{ width: `${caso.progreso}%` }}
            />
          </div>
          <p className="text-xs text-slate-300">{caso.progreso}% completado</p>

          {caso.notas && (
            <div>
              <p className="text-xs text-slate-400 mb-1">Comentarios de tu gestor</p>
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
            Sube aquí la documentación necesaria para tu hipoteca.
          </p>

          {uploadError && (
            <div className="text-red-200 text-xs bg-red-900/40 p-2 rounded-md border border-red-700">
              {uploadError}
            </div>
          )}

          {uploadOk && (
            <div className="text-emerald-200
