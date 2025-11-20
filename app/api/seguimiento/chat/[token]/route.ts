import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno Supabase en /api/seguimiento/chat');
}

const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!);

type Remitente = 'cliente' | 'gestor';

type MensajeRow = {
  id: string;
  caso_id: string;
  remitente: Remitente;
  mensaje: string | null;
  created_at: string;
  attachment_name?: string | null;
  attachment_path?: string | null;
  storage_path?: string | null;
};

type ApiChatList = {
  ok: boolean;
  mensajes?: MensajeRow[];
  error?: string;
};

type ApiChatPost = {
  ok: boolean;
  mensaje?: MensajeRow;
  error?: string;
};

// 🔎 helper: localizar el caso por el seguimiento_token
async function getCasoIdFromToken(token: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('casos')
    .select('id')
    .eq('seguimiento_token', token)
    .single();

  if (error || !data) {
    console.error('Error buscando caso por token de seguimiento:', error);
    return null;
  }

  return data.id as string;
}

// GET: mensajes del chat para este token (cliente)
export async function GET(
  _req: Request,
  { params }: { params: { token: string } }
) {
  const token = params.token;

  if (!token) {
    return NextResponse.json(
      { ok: false, error: 'Falta token' } as ApiChatList,
      { status: 400 }
    );
  }

  const casoId = await getCasoIdFromToken(token);
  if (!casoId) {
    return NextResponse.json(
      { ok: false, error: 'not_found' } as ApiChatList,
      { status: 404 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from('expediente_mensajes')
    .select(
      `
      id,
      caso_id,
      remitente,
      mensaje,
      attachment_name,
      attachment_path,
      storage_path,
      created_at
    `
    )
    .eq('caso_id', casoId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error GET seguimiento chat:', error);
    return NextResponse.json(
      { ok: false, error: 'No se pudo cargar el chat' } as ApiChatList,
      { status: 500 }
    );
  }

  return NextResponse.json(
    { ok: true, mensajes: data ?? [] } as ApiChatList,
    { status: 200 }
  );
}

// POST: mensaje del cliente (texto, adjunto o ambos)
export async function POST(
  req: Request,
  { params }: { params: { token: string } }
) {
  const token = params.token;

  if (!token) {
    return NextResponse.json(
      { ok: false, error: 'Falta token' } as ApiChatPost,
      { status: 400 }
    );
  }

  const casoId = await getCasoIdFromToken(token);
  if (!casoId) {
    return NextResponse.json(
      { ok: false, error: 'not_found' } as ApiChatPost,
      { status: 404 }
    );
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch (e) {
    console.error('Error parseando body seguimiento chat:', e);
    return NextResponse.json(
      { ok: false, error: 'Cuerpo inválido' } as ApiChatPost,
      { status: 400 }
    );
  }

  const {
    mensaje,
    attachment_name,
    attachment_path,
    storage_path,
  } = body as {
    mensaje?: string;
    attachment_name?: string | null;
    attachment_path?: string | null;
    storage_path?: string | null;
  };

  const trimmedMensaje = mensaje?.toString().trim() ?? '';
  const hasMensaje = trimmedMensaje.length > 0;
  const hasAdjunto =
    !!attachment_name || !!attachment_path || !!storage_path;

  if (!hasMensaje && !hasAdjunto) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Debes enviar un mensaje o adjuntar un archivo',
      } as ApiChatPost,
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from('expediente_mensajes')
    .insert({
      caso_id: casoId,
      remitente: 'cliente' as Remitente,
      mensaje: hasMensaje ? trimmedMensaje : null,
      attachment_name: attachment_name ?? null,
      attachment_path: attachment_path ?? null,
      storage_path: storage_path ?? null,
    })
    .select(
      `
      id,
      caso_id,
      remitente,
      mensaje,
      attachment_name,
      attachment_path,
      storage_path,
      created_at
    `
    )
    .single();

  if (error) {
    console.error('Error POST seguimiento chat:', error);
    return NextResponse.json(
      { ok: false, error: 'No se pudo guardar el mensaje' } as ApiChatPost,
      { status: 500 }
    );
  }

  // Marcar en CASOS que hay mensajes nuevos del cliente
  const { error: updError } = await supabaseAdmin
    .from('casos')
    .update({ cliente_tiene_mensajes_nuevos: true })
    .eq('id', casoId);

  if (updError) {
    console.error(
      'No se pudo marcar cliente_tiene_mensajes_nuevos = true (seguimiento):',
      updError
    );
  }

  return NextResponse.json(
    { ok: true, mensaje: data } as ApiChatPost,
    { status: 201 }
  );
}
