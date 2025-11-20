'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

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
  mensaje: string;
  created_at: string;
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

const ESTADO_LABEL: Record<string, string> = {
  en_estudio: 'En estudio',
  tasacion: 'Tasación',
  fein: 'FEIN / Oferta',
  notaria: 'Notaría',
  compraventa: 'Firma compraventa',
  fin: 'Expediente finalizado',
  denegado: 'Denegado',
};

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

  // ---------------- CARGA DATOS CASO + LOGS ----------------
  useEffect(() => {
    const loadData = async () => {
      if (!token) return;

      setLoading(true);
      setErrorMsg(null);

      try {
        const res = await fetch(`/api/seguimiento/${token}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
        });

        const json: ApiSeguimientoResponse = await res.json();

        if (!res.ok) {
          if (json.error === 'not_found') {
            setErrorMsg(
              'No hemos encontrado ningún expediente asociado a este enlace. Es posible que haya caducado o sea incorrecto.'
            );
          } else {
            setErrorMsg('Error al cargar el seguimiento del expediente.');
          }
          setLoading(false);
          return;
        }

        if (!json.data) {
          setErrorMsg(
            'No hemos encontrado ningún expediente asociado a este enlace.'
          );
          setLoading(false);
          return;
        }

        setCaso(json.data);
        setLogs(json.logs ?? []);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setErrorMsg('Error inesperado al cargar el expediente.');
        setLoading(false);
      }
    };

    loadData();
  }, [token]);

  // ---------------- CARGA CHAT (cliente) ----------------
  const loadChat = async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/seguimiento/chat/${token}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      });

      const json: ApiChatResponse = await res.json();

      if (!res.ok) {
        console.error('Error cargando chat cliente:', json.error);
        return;
      }

      setMensajes(json.mensajes ?? []);
    } catch (e) {
      console.error('Error inesperado cargando chat cliente:', e);
    }
  };

  useEffect(() => {
    loadChat();

    // pequeño refresco cada 10s
    const interval = setInterval(() => {
      loadChat();
    }, 10000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

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

      if (!res.ok || !json.ok || !json.mensaje) {
        console.error('Error enviando mensaje cliente:', json.error);
        setChatError('Ha ocurrido un error enviando tu mensaje.');
        setEnviando(false);
        return;
      }

      setNuevoMensaje('');
      setMensajes((prev) => [...prev, json.mensaje]);
    } catch (e) {
      console.error('Error inesperado enviando mensaje cliente:', e);
      setChatError('Ha ocurrido un error enviando tu mensaje.');
    } finally {
      setEnviando(false);
    }
  };

  // ---------------- RENDER ----------------
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <div className="text-sm text-slate-300">Cargando expediente…</div>
      </div>
    );
  }

  if (errorMsg || !caso) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-lg font-semibold">Enlace de seguimiento no válido</h1>
          <p className="text-sm text-slate-300">{errorMsg}</p>
        </div>
      </div>
    );
  }

  const estadoLabel = ESTADO_LABEL[caso.estado] ?? 'En curso';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <main className="max-w-2xl mx-auto px-6 py-10 space-y-6">
        {/* CABECERA */}
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-emerald-400">
            Seguimiento de expediente hipotecario
          </p>
          <h1 className="text-2xl font-semibold">{caso.titulo}</h1>
          <p className="text-xs text-slate-400">
            Creado el{' '}
            {new Date(caso.created_at).toLocaleDateString('es-ES')}
          </p>
        </header>

        {/* ESTADO Y PROGRESO */}
        <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 space-y-4">
          <div>
            <p className="text-xs text-slate-400 mb-1">Estado actual</p>
            <p className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
              {estadoLabel}
            </p>
          </div>

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

          {caso.notas && (
            <div>
              <p className="text-xs text-slate-400 mb-1">
                Comentarios de tu gestor
              </p>
              <p className="text-sm text-slate-100 whitespace-pre-wrap">
                {caso.notas}
              </p>
            </div>
          )}
        </section>

        {/* TIMELINE VISIBLE PARA CLIENTE */}
        <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-200">
            Historial de tu expediente
          </h2>
          <p className="text-xs text-slate-400">
            Aquí puedes ver los principales hitos: cambios de estado, avance y
            documentación añadida.
          </p>

          {logs.length === 0 ? (
            <p className="text-xs text-slate-500">
              Aún no hay movimientos registrados visibles para este expediente.
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
                      {new Date(log.created_at).toLocaleString('es-ES')}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* CHAT CON TU GESTOR */}
        <section className="rounded-lg border border-emerald-700 bg-emerald-950/30 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-emerald-100">
            Chat con tu gestor
          </h2>
          <p className="text-xs text-emerald-200/80">
            Envía mensajes directos a tu gestor sobre este expediente. Te
            responderá desde su panel interno.
          </p>

          <div className="max-h-64 overflow-y-auto space-y-2 pr-1 bg-slate-950/40 rounded-md p-2">
            {mensajes.length === 0 && (
              <p className="text-xs text-slate-500">
                Todavía no hay mensajes. Puedes escribir el primero.
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
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-xs ${
                      esCliente
                        ? 'bg-emerald-600 text-slate-950'
                        : 'bg-slate-800 text-slate-100'
                    }`}
                  >
                    <p>{m.mensaje}</p>
                    <p className="mt-1 text-[10px] opacity-70">
                      {new Date(m.created_at).toLocaleString('es-ES')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {chatError && (
            <div className="rounded-md border border-red-600 bg-red-950/60 px-3 py-2 text-[11px] text-red-100">
              {chatError}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <input
              type="text"
              value={nuevoMensaje}
              onChange={(e) => setNuevoMensaje(e.target.value)}
              placeholder="Escribe tu mensaje para tu gestor…"
              className="flex-1 rounded-md bg-slate-950 border border-emerald-700 px-3 py-2 text-xs text-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <button
              type="button"
              onClick={handleSendMessage}
              disabled={!nuevoMensaje.trim() || enviando}
              className="px-4 py-2 rounded-md bg-emerald-500 text-xs font-medium text-slate-950 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {enviando ? 'Enviando…' : 'Enviar'}
            </button>
          </div>
        </section>

        <footer className="text-xs text-slate-500">
          Última actualización:{' '}
          {new Date(caso.updated_at).toLocaleString('es-ES')}
        </footer>
      </main>
    </div>
  );
}
