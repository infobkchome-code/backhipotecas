import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    '❌ Faltan variables de entorno Supabase en /api/seguimiento/chat'
  );
}

const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!);

type Remitente = 'cliente' | 'gestor';

type MensajeRow = {
  id: string;
  caso_id: string;
  remitente: Remitente;
  mensaje: string | null;
  attachment_name: string | null;
  attachment_path: string | null;
  storage_path: string | null;
  created_at: string;
};

type ApiChatGet = {
  ok: boolean;
  mensajes: MensajeRow[];
};

type ApiChatPost = {
  ok: boolean;
  mensaje: MensajeRow;
};

async function getCasoIdByToken(token: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('casos')
    .select('id')
    .eq('seguimiento_token', token)
    .single();

  if (error || !data) {
    console.error('Error buscando caso por token en seguimiento/chat:', error);
    return null;
  }

  return data.id as string;
}

// GET → mensajes del chat del cliente (por token de seguimiento)
export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  const token = params.token;

  if (!token) {
    return NextResponse.json(
      { ok: false, error: 'Falta el token en la URL' },
      { status: 400 }
    );
  }

  const casoId = await getCasoIdByToken(token);
  if (!casoId) {
    return NextResponse.json(
      { ok: false, error: 'Expediente no encontrado para este enlace' },
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
      { ok: false, error: 'No se pudieron cargar los mensajes' },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { ok: true, mensajes: (data ?? []) as MensajeRow[] } as ApiChatGet,
    { status: 200 }
  );
}

// POST → mensaje nuevo del CLIENTE (texto y/o adjunto)
export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const token = params.token;

  if (!token) {
    return NextResponse.json(
      { ok: false, error: 'Falta el token en la URL' },
      { status: 400 }
    );
  }

  const casoId = await getCasoIdByToken(token);
  if (!casoId) {
    return NextResponse.json(
      { ok: false, error: 'Expediente no encontrado para este enlace' },
      { status: 404 }
    );
  }

  const body = await req.json().catch(() => ({} as any));
  const remitente: Remitente = 'cliente';

  const mensaje: string | undefined = body?.mensaje;
  const attachment_name: string | undefined = body?.attachment_name;
  const attachment_path: string | undefined = body?.attachment_path;
  const storage_path: string | undefined = body?.storage_path;

  if (!mensaje && !attachment_name) {
    return NextResponse.json(
      {
        ok: false,
        error: 'El mensaje no puede estar vacío (texto o archivo requerido)',
      },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from('expediente_mensajes')
    .insert({
      caso_id: casoId,
      remitente,
      mensaje: mensaje ?? null,
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

  if (error || !data) {
    console.error('Error POST seguimiento chat:', error);
    return NextResponse.json(
      { ok: false, error: 'No se pudo guardar el mensaje' },
      { status: 500 }
    );
  }

  // Marcar en el caso que hay mensajes nuevos del cliente
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
    { ok: true, mensaje: data as MensajeRow } as ApiChatPost,
    { status: 201 }
  );
}
