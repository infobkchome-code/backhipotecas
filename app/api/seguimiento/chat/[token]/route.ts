import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// Buscar el caso por token
async function getCasoIdByToken(token: string) {
  const { data, error } = await supabase
    .from('casos')
    .select('id')
    .eq('seguimiento_token', token)
    .single();

  if (error || !data) return null;
  return data.id as string;
}

/**
 * GET → mensajes del chat del cliente
 */
export async function GET(
  _req: Request,
  { params }: { params: { token: string } }
) {
  const token = params.token;

  const casoId = await getCasoIdByToken(token);
  if (!casoId) {
    return NextResponse.json(
      { ok: false, error: 'not_found' },
      { status: 404 }
    );
  }

  const { data, error } = await supabase
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
    console.error('Error GET chat cliente:', error);
    return NextResponse.json(
      { ok: false, error: 'No se pudieron cargar los mensajes' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, mensajes: data ?? [] });
}

/**
 * POST → nuevo mensaje del cliente (texto y/o archivo)
 */
export async function POST(
  req: Request,
  { params }: { params: { token: string } }
) {
  const token = params.token;
  const casoId = await getCasoIdByToken(token);

  if (!casoId) {
    return NextResponse.json(
      { ok: false, error: 'not_found' },
      { status: 404 }
    );
  }

  const body = await req.json();

  const mensaje: string | null = body.mensaje ?? null;
  const attachment_name: string | null = body.attachment_name ?? null;
  const attachment_path: string | null = body.attachment_path ?? null;
  const storage_path: string | null = body.storage_path ?? null;

  // al menos texto o archivo
  if (
    (!mensaje || mensaje.trim().length === 0) &&
    !attachment_path &&
    !storage_path
  ) {
    return NextResponse.json(
      { ok: false, error: 'El mensaje está vacío' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('expediente_mensajes')
    .insert({
      caso_id: casoId,
      remitente: 'cliente',
      mensaje: mensaje?.trim() ?? null,
      attachment_name,
      attachment_path,
      storage_path,
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
    console.error('Error POST chat cliente:', error);
    return NextResponse.json(
      { ok: false, error: 'No se pudo guardar el mensaje' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, mensaje: data });
}
