// app/api/seguimiento/upload/[token]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Supabase con SERVICE ROLE (solo en servidor)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Faltan variables de entorno de Supabase para upload');
}

const supabaseAdmin = createClient(supabaseUrl!, serviceKey!);

// Nombre REAL del bucket
const STORAGE_BUCKET = 'expediente_documentos';

// pequeño helper para buscar el caso por token
async function getCasoByToken(token: string) {
  const { data, error } = await supabaseAdmin
    .from('casos')
    .select('id, titulo')
    .eq('seguimiento_token', token)
    .single();

  if (error || !data) return null;
  return data as { id: string; titulo: string | null };
}

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const token = params.token;

  if (!token) {
    return NextResponse.json(
      { ok: false, error: 'Falta token en la URL' },
      { status: 400 }
    );
  }

  // 1) Buscar el caso por token
  const caso = await getCasoByToken(token);
  if (!caso) {
    return NextResponse.json(
      { ok: false, error: 'Expediente no encontrado para este enlace' },
      { status: 404 }
    );
  }

  // 2) Leer el formData (file + docId)
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const docId = formData.get('docId') as string | null;

  if (!file) {
    return NextResponse.json(
      { ok: false, error: 'No se ha recibido ningún archivo' },
      { status: 400 }
    );
  }

  const originalName = file.name || 'documento.pdf';

  // normalizar nombre
  const safeName = originalName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9.\-_]/g, '_');

  const timestamp = Date.now();
  const folder = docId || 'otros';
  const storagePath = `${caso.id}/${folder}/${timestamp}-${safeName}`;

  // 3) Subir al bucket con SERVICE KEY
  const { error: uploadError } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, file);

  if (uploadError) {
    console.error('❌ Error subiendo archivo cliente:', uploadError);
    return NextResponse.json(
      { ok: false, error: 'No se ha podido subir el archivo al servidor' },
      { status: 500 }
    );
  }

  // 4) Obtener URL pública
  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);

  // 5) Crear mensaje en el chat (remitente = cliente)
  const mensajeTexto = docId
    ? `Documento subido: ${docId}`
    : 'Documento subido por el cliente';

  const { data: mensajeRow, error: insertError } = await supabaseAdmin
    .from('expediente_mensajes')
    .insert({
      caso_id: caso.id,
      remitente: 'cliente',
      mensaje: mensajeTexto,
      attachment_name: originalName,
      attachment_path: publicUrl,
      storage_path: storagePath,
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

  if (insertError || !mensajeRow) {
    console.error('❌ Error insertando mensaje de archivo:', insertError);
    return NextResponse.json(
      {
        ok: false,
        error:
          'El archivo se ha subido, pero no se ha registrado correctamente el mensaje.',
      },
      { status: 500 }
    );
  }

  // 6) Marcar que hay mensaje nuevo del cliente en la tabla casos
  await supabaseAdmin
    .from('casos')
    .update({ cliente_tiene_mensajes_nuevos: true })
    .eq('id', caso.id);

  return NextResponse.json(
    {
      ok: true,
      mensaje: mensajeRow,
    },
    { status: 200 }
  );
}
