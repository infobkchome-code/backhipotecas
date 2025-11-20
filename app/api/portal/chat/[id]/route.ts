import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

type RouteParams = {
  params: { id: string };
};

// -------------------------
// GET: lista de mensajes
// -------------------------
export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const casoId = params.id;

    if (!casoId) {
      return NextResponse.json(
        { error: 'missing_case_id' },
        { status: 400 }
      );
    }

    const { data: mensajes, error } = await supabase
      .from('expediente_mensajes')
      .select('id, caso_id, remitente, mensaje, created_at')
      .eq('caso_id', casoId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error GET /portal/chat:', error);
      return NextResponse.json(
        { error: 'db_error', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: true, mensajes: mensajes ?? [] },
      { status: 200 }
    );
  } catch (e: any) {
    console.error('Error inesperado GET /portal/chat:', e);
    return NextResponse.json(
      { error: 'server_error', details: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}

// -------------------------
// POST: mensaje nuevo gestor
// -------------------------
export async function POST(req: Request, { params }: RouteParams) {
  try {
    const casoId = params.id;

    if (!casoId) {
      return NextResponse.json(
        { error: 'missing_case_id' },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => null);
    const mensaje = body?.mensaje;

    if (!mensaje || typeof mensaje !== 'string' || mensaje.trim() === '') {
      return NextResponse.json(
        { error: 'missing_message' },
        { status: 400 }
      );
    }

    // (Opcional) Comprobar que el caso existe
    const { data: caso, error: casoError } = await supabase
      .from('casos')
      .select('id')
      .eq('id', casoId)
      .single();

    if (casoError || !caso) {
      console.error('Caso no encontrado en POST /portal/chat:', casoError);
      return NextResponse.json(
        { error: 'case_not_found' },
        { status: 404 }
      );
    }

    // Insertar mensaje como "gestor"
    const { data: insertData, error: insertError } = await supabase
      .from('expediente_mensajes')
      .insert({
        caso_id: casoId,
        remitente: 'gestor', // 👈 importante: tiene que coincidir con el tipo definido en la tabla
        mensaje: mensaje.trim(),
      })
      .select('id, caso_id, remitente, mensaje, created_at')
      .single();

    if (insertError) {
      console.error('Error insertando mensaje gestor:', insertError);
      return NextResponse.json(
        {
          error: 'db_error',
          details: insertError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: true, mensaje: insertData },
      { status: 200 }
    );
  } catch (e: any) {
    console.error('Error inesperado POST /portal/chat:', e);
    return NextResponse.json(
      { error: 'server_error', details: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
