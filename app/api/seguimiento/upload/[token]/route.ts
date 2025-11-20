import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno de Supabase en upload');
}

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

// 🔴 MUY IMPORTANTE → nombre EXACTO del bucket en Supabase Storage
const STORAGE_BUCKET = 'expediente_documentos';

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const token = params.token;

  try {
    // 1) Buscar el caso por seguimiento_token
    const { data: caso, error: casoError } = await supabase
      .from('casos')
      .select('id, titulo')
      .eq('seguimiento_token', token)
      .single();

    if (casoError || !caso) {
      console.error('❌ Caso no encontrado para token en upload:', casoError);
      return NextResponse.json(
        { ok: false, error: 'Expediente no encontrado' },
        { status: 404 }
      );
    }

    // 2) Leer form-data
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const docId = (formData.get('docId') as string | null) ?? 'documento';

    if (!file) {
      return NextResponse.json(
        { ok: false, error: 'No se ha enviado ningún archivo' },
        { status: 400 }
      );
    }

    // etiqueta bonita para el mensaje
    const docLabels: Record<string, string> = {
      dni_comprador: 'DNI/NIE de comprador(es)',
      dni_cliente: 'DNI/NIE del cliente',
      nominas_3m: 'Nóminas de los últimos 3 meses',
      contrato_trabajo: 'Contrato de trabajo',
      vida_laboral: 'Informe de vida laboral',
      renta: 'Declaración de la renta',
      extractos_6m: 'Extractos bancarios últimos 6 meses',
      extractos_3_6m: 'Extractos bancarios 3–6 meses',
    };
    const docLabel = docLabels[docId] ?? 'Documento';

    const ext = file.name.split('.').pop();
    const safeName = file.name.replace(/\s+/g, '_');
    const filePath = `${caso.id}/${docId}/${Date.now()}-${safeName}`;

    // 3) Subir al bucket
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

    // 4) Obtener URL pública
    const { data: publicData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    const publicUrl = publicData.publicUrl;

    // 5) Crear mensaje en expediente_mensajes (remitente = cliente)
    const textoMensaje = `Documento subido: ${docLabel}`;

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

    // 6) Marcar que el cliente tiene mensajes nuevos
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
