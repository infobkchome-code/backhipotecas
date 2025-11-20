// app/api/portal/chat/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ⚙️ Supabase desde variables de entorno
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno de Supabase');
}

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

// GET /api/portal/chat/[id]
// Devuelve todos los mensajes del caso
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const casoId = params.id;

  if (!casoId) {
    return NextResponse.json(
      { ok: false, error: 'Falta el id del caso en la URL.' },
      { status: 400 }
    );
  }

  try {
    const { data, error } = await supabase
      .from('expediente_mensajes') // 👈 CAMBIA SI TU TABLA SE LLAMA DISTINTO
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
      console.error('❌ Error Supabase GET /chat:', error);
      return NextResponse.json(
        { ok: false, error: 'No se pudieron obtener los mensajes.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        messages: data ?? [],
      },
      { status: 200 }
    );
  } catch (e) {
    console.error('❌ Excepción GET /chat:', e);
    return NextResponse.json(
      { ok: false, error: 'Error inesperado al obtener los mensajes.' },
      { status: 500 }
    );
  }
}

// POST /api/portal/chat/[id]
// Crea un nuevo mensaje en el chat del caso
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const casoId = params.id;

  if (!casoId) {
    return NextResponse.json(
      { ok: false, error: 'Falta el id del caso en la URL.' },
      { status: 400 }
    );
  }

  // Intentamos leer JSON; si falla, seguimos con body vacío
  let body: any = {};
  try {
    body = await req.json();
  } catch (e) {
    console.warn('⚠️ No se pudo parsear JSON en POST /chat, body vacío:', e);
  }

  const remitente = body?.remitente || 'cliente'; // valor por defecto
  const mensaje = body?.mensaje ?? null;
  const attachment_name = body?.attachment_name ?? null;
  const attachment_path = body?.attachment_path ?? null;
  const storage_path = body?.storage_path ?? null;

  try {
    const { data, error } = await supabase
      .from('caso_mensajes') // 👈 CAMBIA SI TU TABLA SE LLAMA DISTINTO
      .insert({
        caso_id: casoId,
        remitente,
        mensaje,
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
      console.error('❌ Error Supabase POST /chat:', error);
      return NextResponse.json(
        { ok: false, error: 'No se pudo guardar el mensaje.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        message: data,
      },
      { status: 201 }
    );
  } catch (e) {
    console.error('❌ Excepción POST /chat:', e);
    return NextResponse.json(
      { ok: false, error: 'Error inesperado al guardar el mensaje.' },
      { status: 500 }
    );
  }
}
