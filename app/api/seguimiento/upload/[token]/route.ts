import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Supabase con SERVICE ROLE (solo en el backend)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno de Supabase en upload');
}

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

// Nombre del bucket de storage
const STORAGE_BUCKET = 'expediente-archivos';

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const token = params.token;

  try {
    // 1) Buscar el caso por el seguimiento_token
    const { data: caso, error: casoError } = await supabase
      .from('casos')
      .select('id, titulo, cliente_tiene_mensajes_nuevos')
      .eq('seguimiento_token', token)
      .single();

    if (casoError || !caso) {
      console.error('❌ Caso no encontrado para token en upload:', casoError);
      return NextResponse.json(
        { ok: false, error: 'Expediente no encontrado' },
        { status: 404 }
      );
    }

    // 2) Leer el form-data (file + docId)
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const docId = (formData.get('docId') as string | null) ?? 'documento';

    if (!file) {
      return NextResponse.json(
        { ok: false, error: 'No se ha enviado ningún archivo' },
        { status: 400 }
      );
    }

    // 3) Subir al bucket
    const ext = file.name.split('.').pop();
    const safeName = file.name.replace(/\s+/g, '_');
    const filePath = `${caso.id}/${Date.now()}-${docId}.${ext ?? 'file'}`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('❌ Error subiendo archivo a storage:', uploadError);
      return NextResponse.json(
        { ok: false, error: 'No se ha podido subir el archivo' },
        { status: 500 }
      );
    }

    // 4) Conseguir URL pública
    const { data: publicData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    const publicUrl = publicData.publicUrl;

    // 5) Crear mensaje de chat (remitente = cliente) con adjunto
    const textoMensaje = `Documento subido: ${docId}`;

    const { data: mensaje, error: msgError } = await supabase
      .from('expediente_mensajes')
      .insert({
        caso_id: caso.id,
        remitente: 'cliente',
        mensaje: textoMensaje,
        attachment_name: safeName,
        attachment_path: publicUrl,
        storage_path: filePath,
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

    if (msgError || !mensaje) {
      console.error('❌ Error guardando mensaje de archivo:', msgError);
      return NextResponse.json(
        {
          ok: false,
          error:
            'El archivo se ha subido, pero no se ha podido registrar el mensaje.',
        },
        { status: 500 }
      );
    }

    // 6) Marcar que el cliente tiene mensajes nuevos para que salte el aviso
    await supabase
      .from('casos')
      .update({ cliente_tiene_mensajes_nuevos: true })
      .eq('id', caso.id);

    return NextResponse.json({ ok: true, mensaje }, { status: 201 });
  } catch (e) {
    console.error('❌ Excepción en upload seguimiento:', e);
    return NextResponse.json(
      { ok: false, error: 'Error inesperado subiendo el archivo' },
      { status: 500 }
    );
  }
}
