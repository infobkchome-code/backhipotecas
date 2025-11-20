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
        { error: 'db_error' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: true, mensajes: mensajes ?? [] },
      { status: 200 }
    );
  } catch (e) {
    console.error('Error inesperado GET /portal/chat:', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}

// POST: mensaje nuevo del gestor
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const casoId = params.id;
    const { mensaje } = await req.json();

    if (!mensaje || typeof mensaje !== 'string') {
      return NextResponse.json(
        { error: 'missing_message' },
        { status: 400 }
      );
    }

    // Comprobar que el caso existe (opcional pero sano)
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

    const { data: insertData, error: insertError } = await supabase
      .from('expediente_mensajes')
      .insert({
        caso_id: casoId,
        remitente: 'gestor',
        mensaje,
      })
      .select('id, caso_id, remitente, mensaje, created_at')
      .single();

    if (insertError) {
      console.error('Error insertando mensaje gestor:', insertError);
      return NextResponse.json(
        { error: 'db_error' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: true, mensaje: insertData },
      { status: 200 }
    );
  } catch (e) {
    console.error('Error inesperado POST /portal/chat:', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
