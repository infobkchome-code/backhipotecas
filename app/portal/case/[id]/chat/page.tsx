'use client';

import { useEffect, useState, useRef, FormEvent, ChangeEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

type ChatMessage = {
  id: string;
  caso_id: string;
  remitente: 'gestor' | 'cliente';
  mensaje: string | null;
  attachment_name: string | null;
  attachment_path?: string | null; // por si usamos este nombre
  storage_path?: string | null;    // o este
  created_at: string;
};

type CasoBasic = {
  id: string;
  titulo: string;
  seguimiento_token: string | null;
};

type ApiListResponse = {
  ok: boolean;
  mensajes?: ChatMessage[]; // 👈 nombre real que devuelve la API
  error?: string;
};

type ApiSendResponse = {
  ok: boolean;
  mensaje?: ChatMessage; // 👈 nombre real que devuelve la API
  error?: string;
};

export default function CaseChatPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const casoId = params?.id as string;

  const [caso, setCaso] = useState<CasoBasic | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [newMessage, setNewMessage] = useState('');
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);

  const [uploadPreviewName, setUploadPreviewName] = useState<string | null>(
    null
  );

  const [isClientOnline, setIsClientOnline] = useState(false);
  const [isClientTyping, setIsClientTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // ------ helpers ------

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const normalizeMessage = (raw: any): ChatMessage => ({
    id: raw.id,
    caso_id: raw.caso_id,
    remitente: raw.remitente,
    mensaje: raw.mensaje ?? null,
    attachment_name: raw.attachment_name ?? null,
    attachment_path: raw.attachment_path ?? raw.storage_path ?? null,
    storage_path: raw.storage_path ?? raw.attachment_path ?? null,
    created_at: raw.created_at,
  });

  const upsertMessage = (msg: ChatMessage) => {
    setMessages((prev) => {
      const exists = prev.some((m) => m.id === msg.id);
      if (exists) {
        return prev.map((m) => (m.id === msg.id ? msg : m));
      }
      return [...prev, msg].sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });
  };

  // ------ cargar caso + mensajes iniciales ------
  useEffect(() => {
    const load = async () => {
      if (!casoId) return;

      setLoading(true);
      setErrorMsg(null);

      try {
        // 1) Datos básicos del caso (para título y enlace de seguimiento)
        const { data: casoData, error: casoError } = await supabase
          .from('casos')
          .select('id, titulo, seguimiento_token')
          .eq('id', casoId)
          .single();

        if (casoError || !casoData) {
          console.error('Error cargando caso en chat:', casoError);
          setErrorMsg('No se ha encontrado el expediente para el chat.');
          setLoading(false);
          return;
        }

        setCaso(casoData as CasoBasic);

        // 2) Mensajes iniciales vía API
        const res = await fetch(`/api/portal/chat/${casoId}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
        });

        const json: ApiListResponse = await res.json();

        if (!res.ok || !json.ok) {
          console.error('Error API chat GET:', json.error);
          setErrorMsg('No se han podido cargar los mensajes del chat.');
          setLoading(false);
          return;
        }

        const msgs = (json.mensajes ?? []).map(normalizeMessage);
        setMessages(msgs);
        setLoading(false);

        setTimeout(scrollToBottom, 100);
      } catch (e) {
        console.error('Error general cargando chat:', e);
        setErrorMsg('Ha ocurrido un error cargando el chat.');
        setLoading(false);
      }
    };

    load();
  }, [casoId]);

  // ------ realtime: nuevos mensajes + presencia/typing cliente ------
  useEffect(() => {
    if (!casoId) return;

    // Realtime de mensajes nuevos
    const channel = supabase
      .channel(`chat-caso-${casoId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'expediente_chat_messages',
          filter: `caso_id=eq.${casoId}`,
        },
        (payload) => {
          const raw = payload.new as any;
          const msg = normalizeMessage(raw);
          upsertMessage(msg);
          setTimeout(scrollToBottom, 50);
        }
      )
      // OPCIONAL: canal broadcast para presencia/typing del cliente
      .on('broadcast', { event: 'cliente_online' }, () => {
        setIsClientOnline(true);
        setTimeout(() => setIsClientOnline(false), 30000); // si no hay señales se apaga
      })
      .on('broadcast', { event: 'cliente_typing' }, () => {
        setIsClientTyping(true);
        setTimeout(() => setIsClientTyping(false), 3000);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [casoId]);

  // ------ envío de mensajes (solo texto, acorde con la API actual) ------
  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    // Por ahora la API solo soporta texto, no adjuntos.
    if (!newMessage.trim()) return;
    if (!casoId) return;

    setSending(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/portal/chat/${casoId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mensaje: newMessage.trim(),
        }),
      });

      const json: ApiSendResponse = await res.json();

      if (!res.ok || !json.ok || !json.mensaje) {
        console.error('Error enviando mensaje chat:', json.error);
        setErrorMsg('No se ha podido enviar el mensaje.');
        setSending(false);
        return;
      }

      const msg = normalizeMessage(json.mensaje);
      upsertMessage(msg);

      setNewMessage('');
      // dejamos preparado el manejo de adjuntos para más adelante
      setFileToUpload(null);
      setUploadPreviewName(null);
      setTimeout(scrollToBottom, 50);
    } catch (e) {
      console.error('Error general enviando mensaje:', e);
      setErrorMsg('Ha ocurrido un error enviando el mensaje.');
    } finally {
      setSending(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setFileToUpload(file);
    setUploadPreviewName(file ? file.name : null);
  };

  const handleClearFile = () => {
    setFileToUpload(null);
    setUploadPreviewName(null);
  };

  // Descarga / ver adjunto
  const handleDownloadAttachment = async (msg: ChatMessage) => {
    const path = msg.attachment_path || msg.storage_path;
    if (!path) return;

    const { data, error } = await supabase.storage
      .from('docs')
      .createSignedUrl(path, 60 * 10);

    if (error || !data?.signedUrl) {
      console.error('Error creando signed URL adjunto:', error);
      setErrorMsg('No se ha podido abrir el adjunto.');
      return;
    }

    window.open(data.signedUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <div className="text-sm text-slate-300">Cargando chat…</div>
      </div>
    );
  }

  if (!caso) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col items-center justify-center px-4">
        <p className="text-lg font-semibold mb-2">Expediente no encontrado</p>
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
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      {/* HEADER */}
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <button
            onClick={() => router.push(`/portal/case/${caso.id}`)}
            className="text-xs text-slate-400 hover:text-slate-200 mb-1 text-left"
          >
            ← Volver al expediente
          </button>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            Chat con el cliente
            <span className="text-xs font-normal text-slate-400">
              · {caso.titulo}
            </span>
          </h1>
          {trackingUrl && (
            <p className="text-[11px] text-slate-500 mt-0.5">
              Enlace cliente:{' '}
              <span className="text-emerald-400 break-all">{trackingUrl}</span>
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-1">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] border ${
              isClientOnline
                ? 'border-emerald-500 text-emerald-300 bg-emerald-900/40'
                : 'border-slate-600 text-slate-300 bg-slate-900'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isClientOnline ? 'bg-emerald-400' : 'bg-slate-500'
              }`}
            />
            {isClientOnline ? 'Cliente conectado' : 'Cliente offline'}
          </span>
          {isClientTyping && (
            <span className="text-[10px] text-emerald-300">
              El cliente está escribiendo…
            </span>
          )}
        </div>
      </header>

      {/* CUERPO */}
      <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 md:px-6 py-4 gap-4">
        {/* Mensajes de error */}
        {errorMsg && (
          <div className="rounded-md border border-red-600 bg-red-950/60 px-4 py-2 text-xs text-red-100">
            {errorMsg}
          </div>
        )}

        {/* Área de mensajes */}
        <div className="flex-1 min-h-0 border border-slate-800 rounded-lg bg-slate-900/60 p-3 flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
            {messages.length === 0 && (
              <div className="h-full flex items-center justify-center">
                <p className="text-xs text-slate-500 text-center max-w-xs">
                  Todavía no hay mensajes. Envía el primero para iniciar la
                  conversación con tu cliente.
                </p>
              </div>
            )}

            {messages.map((msg) => {
              const isGestor = msg.remitente === 'gestor';
              const filePath = msg.attachment_path || msg.storage_path;
              const hasFile = !!filePath;

              return (
                <div
                  key={msg.id}
                  className={`flex ${
                    isGestor ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-xs shadow-sm border ${
                      isGestor
                        ? 'bg-emerald-600 text-slate-950 border-emerald-500'
                        : 'bg-slate-800 text-slate-100 border-slate-700'
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-semibold opacity-80">
                        {isGestor ? 'Tú (gestor)' : 'Cliente'}
                      </span>
                      <span className="text-[10px] opacity-70">
                        {new Date(msg.created_at).toLocaleString('es-ES')}
                      </span>
                    </div>

                    {msg.mensaje && (
                      <p className="whitespace-pre-wrap text-[11px] leading-snug">
                        {msg.mensaje}
                      </p>
                    )}

                    {hasFile && (
                      <button
                        type="button"
                        onClick={() => handleDownloadAttachment(msg)}
                        className={`mt-2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] border ${
                          isGestor
                            ? 'border-emerald-800 bg-emerald-700/40 text-slate-950 hover:bg-emerald-600/60'
                            : 'border-slate-600 bg-slate-900/60 text-slate-100 hover:bg-slate-800'
                        }`}
                      >
                        📎 {msg.attachment_name || 'Ver adjunto'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Área de escritura */}
        <form
          onSubmit={handleSend}
          className="border border-slate-800 rounded-lg bg-slate-900/80 p-3 flex flex-col gap-2"
        >
          {uploadPreviewName && (
            <div className="flex items-center justify-between gap-2 text-[11px] text-slate-200 bg-slate-800/80 px-2 py-1 rounded-md">
              <span className="truncate">
                📎 {uploadPreviewName}
              </span>
              <button
                type="button"
                onClick={handleClearFile}
                className="text-slate-300 hover:text-red-300 text-xs"
              >
                Quitar
              </button>
            </div>
          )}

          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Escribe un mensaje para tu cliente…"
            rows={2}
            className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
          />

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-1 text-[11px] text-slate-300 cursor-pointer px-2 py-1 rounded-md border border-slate-700 bg-slate-900 hover:bg-slate-800">
                📎 Adjuntar archivo
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
              <span className="text-[10px] text-slate-500">
                (Los adjuntos los activaremos cuando ampliemos la API)
              </span>
            </div>

            <button
              type="submit"
              disabled={sending || !newMessage.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-emerald-500 text-slate-950 text-sm font-medium hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? 'Enviando…' : 'Enviar mensaje'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
