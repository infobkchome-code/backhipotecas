import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ⚙️ Cliente Supabase con SERVICE ROLE (solo servidor)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno de Supabase en la API de chat');
}

const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!);

/**
 * Helper: enviar email al cliente cuando responde el gestor
 * (lo dejamos preparado, pero ahora mismo solo hace console.log)
 */
async function sendEmailToClient(casoId: string, mensaje: string) {
  // 1) Buscar email y título del caso
  const { data: caso, error: casoError } = await supabaseAdmin
    .from('casos')
    .select('email_cliente, titulo')
    .eq('id', casoId)
    .single();

  if (casoError || !caso?.email_cliente) {
    console.warn(
      'No se pudo obtener email_cliente para enviar notificación:',
      casoError
    );
    return;
  }

  const to = caso.email_cliente as string;
  const subject = `Tienes un nuevo mensaje de tu gestor - BKC Hipotecas`;
  const body = `Hola,

Tienes un nuevo mensaje de tu gestor en relación a tu expediente "${
    caso.titulo ?? ''
  }":

"${mensaje}"

Puedes entrar en tu portal de seguimiento para ver toda la conversación y responder.

Un saludo,
BKC Hipotecas
`;

  // 2) Integración real la hacemos más adelante
  try {
    console.log('Simulando envío de email a cliente:', to, subject);
    // Aquí luego meteremos la llamada a Mailgun/Mailersend/etc.
  } catch (e) {
    console.error('Error enviando email al cliente:', e);
  }
}

/**
 * GET → obtener todos los mensajes del chat de un caso
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

  return NextResponse.json({ ok: true, messages: data ?? [] });
}

/**
 * POST → enviar mensaje al chat
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const casoId = params.id;
  const body = await req.json();

  const { remitente, mensaje } = body as {
    remitente?: 'cliente' | 'gestor';
    mensaje?: string;
  };

  if (!remitente || !['cliente', 'gestor'].includes(remitente)) {
    return NextResponse.json(
      { ok: false, error: 'Remitente no válido' },
      { status: 400 }
    );
  }

  if (!mensaje || mensaje.trim().length === 0) {
    return NextResponse.json(
      { ok: false, error: 'El mensaje no puede estar vacío' },
      { status: 400 }
    );
  }

  // 1) Insertar mensaje
  const { data, error } = await supabaseAdmin
    .from('expediente_mensajes')
    .insert({
      caso_id: casoId,
      remitente,
      mensaje: mensaje.trim(),
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
      { ok: false, error: 'No se pudo guardar el mensaje' },
      { status: 500 }
    );
  }

  // 2) Si el que escribe es el gestor → avisar al cliente por email (simulado)
  if (remitente === 'gestor') {
    sendEmailToClient(casoId, mensaje.trim()).catch((e) =>
      console.error('Error en sendEmailToClient:', e)
    );
  }

  return NextResponse.json({ ok: true, message: data });
}
