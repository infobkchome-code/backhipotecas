import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// GET: lista de mensajes de un caso (gestor)
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const casoId = params.id;

    const { data: mensajes, error } = await supabase
      .from('expediente_mensajes')
      .select('id, caso_id, remitente, mensaje, created_at')
      .eq('caso_id', casoId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error GET /portal/chat:', error);
      return NextResponse.json(
        { ok: false, error: 'db_error' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: true, mensajes: mensajes ?? [] },
      { status: 200 }
    );
  } catch (e) {
    console.error('Error inesperado GET /portal/chat:', e);
    return NextResponse.json(
      { ok: false, error: 'server_error' },
      { status: 500 }
    );
  }
}

// POST: mensaje nuevo del gestor
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const casoId = params.id;

    const contentType = req.headers.get('content-type') || '';
    let mensaje: string | null = null;

    // ---- 1) Intentar leer JSON normal ----
    if (contentType.includes('application/json')) {
      const body = await req.json().catch(() => null as any);
      if (body && typeof body.mensaje === 'string') {
        mensaje = body.mensaje.trim();
      } else if (body && typeof body.message === 'string') {
        mensaje = body.message.trim();
      }
    }
    // ---- 2) Intentar leer multipart/form-data (por si el front manda FormData) ----
    else if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const raw =
        formData.get('mensaje') ||
        formData.get('message') ||
        formData.get('text');

      if (typeof raw === 'string') {
        mensaje = raw.trim();
      }
    }
    // ---- 3) Último intento: leer como texto y parsear JSON a mano ----
    else {
      const rawText = await req.text();
      try {
        const body = JSON.parse(rawText);
        if (body && typeof body.mensaje === 'string') {
          mensaje = body.mensaje.trim();
        } else if (body && typeof body.message === 'string') {
          mensaje = body.message.trim();
        }
      } catch {
        // no pasa nada, mensaje se queda null
      }
    }

    if (!mensaje || mensaje.length === 0) {
      console.warn('POST /portal/chat missing_message');
      return NextResponse.json(
        { ok: false, error: 'missing_message' },
        { status: 400 }
      );
    }

    // Comprobar que el caso existe
    const { data: caso, error: casoError } = await supabase
      .from('casos')
      .select('id')
      .eq('id', casoId)
      .single();

    if (casoError || !caso) {
      console.error('Caso no encontrado en POST /portal/chat:', casoError);
      return NextResponse.json(
        { ok: false, error: 'case_not_found' },
        { status: 404 }
      );
    }

    const { data: insertData, error: insertError } = await supabase
      .from('expediente_mensajes')
      .insert({
        caso_id: casoId,
        remitente: 'gestor',
        mensaje,
      })
      .select('id, caso_id, remitente, mensaje, created_at')
      .single();

    if (insertError || !insertData) {
      console.error('Error insertando mensaje gestor:', insertError);
      return NextResponse.json(
        { ok: false, error: 'db_error' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: true, mensaje: insertData },
      { status: 200 }
    );
  } catch (e) {
    console.error('Error inesperado POST /portal/chat:', e);
    return NextResponse.json(
      { ok: false, error: 'server_error' },
      { status: 500 }
    );
  }
}
