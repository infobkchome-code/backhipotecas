import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ⚙️ Cliente Supabase con SERVICE ROLE (solo servidor)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno de Supabase en la API de chat');
}

const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!);

type Remitente = 'cliente' | 'gestor';

type ChatMessage = {
  id: string;
  caso_id: string;
  remitente: Remitente;
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

/**
 * GET → obtener todos los mensajes del chat de un caso
 * Además, marca cliente_tiene_mensajes_nuevos = FALSE en la tabla casos
 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const casoId = params.id;

  if (!casoId) {
    return NextResponse.json(
      { ok: false, error: 'Falta el id del caso en la URL' },
      { status: 400 }
    );
  }

  // 1) Obtener mensajes
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
    console.error('Error GET chat:', error);
    return NextResponse.json(
      { ok: false, error: 'No se pudieron cargar los mensajes' },
      { status: 500 }
    );
  }

  // 2) Marcar como leídos los mensajes del cliente para este caso
  const { error: updError } = await supabaseAdmin
    .from('casos')
    .update({ cliente_tiene_mensajes_nuevos: false })
    .eq('id', casoId);

  if (updError) {
    console.error(
      'No se pudo actualizar cliente_tiene_mensajes_nuevos en casos:',
      updError
    );
  }

  return NextResponse.json({ ok: true, messages: data ?? [] } as ApiListResponse);
}

/**
 * POST → enviar mensaje al chat
 * También pone cliente_tiene_mensajes_nuevos = TRUE si escribe el cliente
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const casoId = params.id;
  let body: any;

  try {
    body = await req.json();
  } catch (e) {
    console.error('Error parseando JSON en POST /chat:', e);
    return NextResponse.json(
      { ok: false, error: 'Cuerpo de la petición inválido' } as ApiPostResponse,
      { status: 400 }
    );
  }

  const {
    remitente,
    mensaje,
    attachment_name,
    attachment_path,
    storage_path,
  } = body as {
    remitente?: Remitente;
    mensaje?: string;
    attachment_name?: string | null;
    attachment_path?: string | null;
    storage_path?: string | null;
  };

  if (!remitente || !['cliente', 'gestor'].includes(remitente)) {
    return NextResponse.json(
      { ok: false, error: 'Remitente no válido' } as ApiPostResponse,
      { status: 400 }
    );
  }

  if (!mensaje || mensaje.trim().length === 0) {
    return NextResponse.json(
      { ok: false, error: 'El mensaje no puede estar vacío' } as ApiPostResponse,
      { status: 400 }
    );
  }

  // 1) Insertar mensaje (incluyendo posibles adjuntos)
  const { data, error } = await supabaseAdmin
    .from('expediente_mensajes')
    .insert({
      caso_id: casoId,
      remitente,
      mensaje: mensaje.trim(),
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
    console.error('Error POST chat:', error);
    return NextResponse.json(
      { ok: false, error: 'No se pudo guardar el mensaje' } as ApiPostResponse,
      { status: 500 }
    );
  }

  // 2) Si el remitente es el cliente, marcar que hay mensajes nuevos
  if (remitente === 'cliente') {
    const { error: updError } = await supabaseAdmin
      .from('casos')
      .update({ cliente_tiene_mensajes_nuevos: true })
      .eq('id', casoId);

    if (updError) {
      console.error(
        'No se pudo marcar cliente_tiene_mensajes_nuevos = true:',
        updError
      );
    }
  }

  // 3) Si el remitente es el gestor, más adelante aquí haremos el envío de email al cliente
  // (por ahora, lo dejamos pendiente como acordamos)

  return NextResponse.json({ ok: true, message: data } as ApiPostResponse);
}
