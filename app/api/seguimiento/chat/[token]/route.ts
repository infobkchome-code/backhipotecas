import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// GET: mensajes visibles para el cliente a partir del token de seguimiento
export async function GET(
  _req: Request,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token;

    // Buscar caso por token
    const { data: caso, error: casoError } = await supabase
      .from('casos')
      .select('id')
      .eq('seguimiento_token', token)
      .single();

    if (casoError || !caso) {
      console.error('Caso no encontrado en GET /seguimiento/chat:', casoError);
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const { data: mensajes, error } = await supabase
      .from('expediente_mensajes')
      .select('id, caso_id, remitente, mensaje, created_at')
      .eq('caso_id', caso.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error GET /seguimiento/chat:', error);
      return NextResponse.json({ error: 'db_error' }, { status: 500 });
    }

    return NextResponse.json(
      { ok: true, mensajes: mensajes ?? [] },
      { status: 200 }
    );
  } catch (e) {
    console.error('Error inesperado GET /seguimiento/chat:', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}

// POST: mensaje nuevo enviado por el cliente
export async function POST(
  req: Request,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token;
    const { mensaje } = await req.json();

    if (!mensaje || typeof mensaje !== 'string') {
      return NextResponse.json(
        { error: 'missing_message' },
        { status: 400 }
      );
    }

    const { data: caso, error: casoError } = await supabase
      .from('casos')
      .select('id')
      .eq('seguimiento_token', token)
      .single();

    if (casoError || !caso) {
      console.error('Caso no encontrado en POST /seguimiento/chat:', casoError);
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const { data: insertData, error: insertError } = await supabase
      .from('expediente_mensajes')
      .insert({
        caso_id: caso.id,
        remitente: 'cliente',
        mensaje,
      })
      .select('id, caso_id, remitente, mensaje, created_at')
      .single();

    if (insertError) {
      console.error('Error insertando mensaje cliente:', insertError);
      return NextResponse.json({ error: 'db_error' }, { status: 500 });
    }

    return NextResponse.json(
      { ok: true, mensaje: insertData },
      { status: 200 }
    );
  } catch (e) {
    console.error('Error inesperado POST /seguimiento/chat:', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}

