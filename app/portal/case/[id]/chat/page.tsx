'use client';

import { useEffect, useState, useRef, FormEvent, ChangeEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

type ChatMessage = {
  id: string;
  caso_id: string;
  remitente: 'gestor' | 'cliente';
  mensaje: string | null;
  attachment_name: string | null;
  attachment_path?: string | null;
  storage_path?: string | null;
  created_at: string;
};

type ApiListResponse = {
  ok: boolean;
  messages?: ChatMessage[];
  error?: string;
};

type ApiPostResponse = {
  ok: boolean;
  message?: ChatMessage;
  error?: string;
};

export default function ChatPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const casoId = params?.id;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Scroll automático al último mensaje
  const scrollToBottom = () => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  };

  // Cargar mensajes iniciales
  useEffect(() => {
    const fetchMessages = async () => {
      if (!casoId) return;

      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/portal/chat/${casoId}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        const data: ApiListResponse = await res.json();

        if (!res.ok || !data.ok) {
          console.error('Error cargando chat:', data.error);
          setError(data.error ?? 'No se pudieron cargar los mensajes.');
          setMessages([]);
        } else {
          setMessages(data.messages ?? []);
        }
      } catch (e: any) {
        console.error('Excepción cargando chat:', e);
        setError(e?.message ?? 'Error inesperado al cargar el chat.');
      } finally {
        setLoading(false);
        // pequeño delay para que existan los elementos en el DOM
        setTimeout(scrollToBottom, 200);
      }
    };

    fetchMessages();
  }, [casoId]);

  // Enviar mensaje nuevo
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = inputValue.trim();
    if (!trimmed || !casoId) return;

    setSending(true);

    try {
      const res = await fetch(`/api/portal/chat/${casoId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          remitente: 'gestor', // o 'cliente' según quién use este portal
          mensaje: trimmed,
        }),
      });

      const data: ApiPostResponse = await res.json();

      if (!res.ok || !data.ok || !data.message) {
        console.error('Error enviando mensaje chat:', data.error);
        setError(data.error ?? 'No se ha podido enviar el mensaje.');
        return;
      }

      // Añadimos el mensaje devuelto por la API al estado
      setMessages((prev) => [...prev, data.message!]);
      setInputValue('');
      setTimeout(scrollToBottom, 100);
    } catch (e: any) {
      console.error('Excepción enviando mensaje chat:', e);
      setError(e?.message ?? 'No se ha podido enviar el mensaje.');
    } finally {
      setSending(false);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  return (
    <div className="flex flex-col h-full min-h-screen bg-slate-950 text-slate-50">
      {/* Cabecera */}
      <div className="border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <button
          className="text-sm text-slate-300 hover:text-white"
          onClick={() => router.back()}
        >
          ← Volver al expediente
        </button>
        <div className="text-sm font-medium">
          Chat con el cliente · <span className="text-slate-400">Expediente id: {casoId}</span>
        </div>
        <span className="text-xs px-2 py-1 rounded-full bg-slate-800 text-slate-300">
          Cliente offline
        </span>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {error && (
          <div className="mb-2 rounded-md bg-red-900/40 border border-red-600 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        {loading && (
          <div className="text-sm text-slate-400">Cargando mensajes...</div>
        )}

        {!loading && messages.length === 0 && !error && (
          <div className="text-sm text-slate-400">
            Todavía no hay mensajes. Envía el primero para iniciar la conversación con tu cliente.
          </div>
        )}

        {messages.map((msg) => {
          const isGestor = msg.remitente === 'gestor';
          return (
            <div
              key={msg.id}
              className={`flex ${isGestor ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                  isGestor
                    ? 'bg-emerald-600 text-white rounded-br-none'
                    : 'bg-slate-800 text-slate-50 rounded-bl-none'
                }`}
              >
                {msg.mensaje && <div className="whitespace-pre-wrap">{msg.mensaje}</div>}
                <div className="mt-1 text-[11px] opacity-70 text-right">
                  {new Date(msg.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* Caja de texto */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-slate-800 px-4 py-3 flex gap-2 items-center bg-slate-950/95"
      >
        <input
          type="text"
          value={inputValue}
          onChange={handleChange}
          placeholder="Escribe un mensaje..."
          className="flex-1 rounded-full bg-slate-900 border border-slate-700 px-4 py-2 text-sm outline-none focus:border-emerald-500"
        />
        <button
          type="submit"
          disabled={sending || !inputValue.trim()}
          className="rounded-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium"
        >
          {sending ? 'Enviando…' : 'Enviar mensaje'}
        </button>
      </form>
    </div>
  );
}
