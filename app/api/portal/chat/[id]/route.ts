// app/api/portal/chat/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ⚠️ Usa SIEMPRE variables de entorno
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno de Supabase');
}

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

type Remitente = 'gestor' | 'cliente';

interface NewMessagePayload {
  remitente: Remitente;
  mensaje?: string | null;
  attachment_name?: string | null;
  attachment_path?: string | null;
  storage_path?: string | null;
}

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
      .from('caso_mensajes') // 👈 CAMBIA AQUÍ SI TU TABLA SE LLAMA DISTINTO
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

  let body: NewMessagePayload;
  try {
    body = (await req.json()) as NewMessagePayload;
  } catch (e) {
    console.error('❌ Error parseando JSON en POST /chat:', e);
    return NextResponse.json(
      { ok: false, error: 'Cuerpo de la petición inválido. Debe ser JSON.' },
      { status: 400 }
    );
  }

  const {
    remitente,
    mensaje = null,
    attachment_name = null,
    attachment_path = null,
    storage_path = null,
  } = body;

  if (!remitente || (remitente !== 'gestor' && remitente !== 'cliente')) {
    return NextResponse.json(
      {
        ok: false,
        error: "El campo 'remitente' es obligatorio y debe ser 'gestor' o 'cliente'.",
      },
      { status: 400 }
    );
  }

  if (!mensaje && !attachment_name) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Debes enviar al menos un mensaje de texto o un adjunto.',
      },
      { status: 400 }
    );
  }

  try {
    const { data, error } = await supabase
      .from('caso_mensajes') // 👈 CAMBIA AQUÍ SI TU TABLA SE LLAMA DISTINTO
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
