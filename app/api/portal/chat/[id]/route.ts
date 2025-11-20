import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

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

  const { data, error } = await supabase
    .from('expediente_mensajes') // 👈 tu tabla real
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

  const { data, error } = await supabase
    .from('expediente_mensajes') // 👈 misma tabla
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

  return NextResponse.json({ ok: true, message: data });
}
