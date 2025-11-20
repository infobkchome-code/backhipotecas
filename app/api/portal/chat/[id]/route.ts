// app/api/portal/chat/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// Desactivamos caché en este endpoint
export const dynamic = 'force-dynamic';

type Remitente = 'gestor' | 'cliente';

interface NewMessagePayload {
  remitente: Remitente;
  mensaje?: string | null;
  attachment_name?: string | null;
  attachment_path?: string | null; // por si lo usas así
  storage_path?: string | null;    // o así
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

  const { data, error } = await supabase
    .from('caso_mensajes') // 👈 CAMBIA ESTE NOMBRE SI TU TABLA ES OTRA
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
    console.error('Error al obtener mensajes:', error);
    return NextResponse.json(
      { ok: false, error: 'No se pudieron obtener los mensajes del expediente.' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    messages: data ?? [],
  });
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
    console.error('Error parseando el JSON del cuerpo:', e);
    return NextResponse.json(
      { ok: false, error: 'Formato de cuerpo inválido. Debe ser JSON.' },
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
        error: 'Debe enviarse al menos un mensaje de texto o un adjunto.',
      },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('caso_mensajes') // 👈 CAMBIA ESTE NOMBRE SI TU TABLA ES OTRA
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
    console.error('Error al insertar mensaje:', error);
    return NextResponse.json(
      { ok: false, error: 'No se pudo guardar el mensaje en la base de datos.' },
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
}
