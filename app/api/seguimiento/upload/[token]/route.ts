import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno Supabase en /api/seguimiento/upload');
}

const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!);

// 👇 Usa el mismo bucket que estés usando desde el panel admin
const STORAGE_BUCKET = 'expediente-archivos';

type Remitente = 'cliente' | 'gestor';

type MensajeRow = {
  id: string;
  caso_id: string;
  remitente: Remitente;
  mensaje: string | null;
  created_at: string;
  attachment_name?: string | null;
  attachment_path?: string | null;
  storage_path?: string | null;
};

type ApiUploadResponse = {
  ok: boolean;
  mensaje?: MensajeRow;
  error?: string;
};

async function getCasoIdFromToken(token: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('casos')
    .select('id')
    .eq('seguimiento_token', token)
    .single();

  if (error || !data) {
    console.error('Error buscando caso por token en upload:', error);
    return null;
  }

  return data.id as string;
}

export async function POST(
  req: Request,
  { params }: { params: { token: string } }
) {
  const token = params.token;

  if (!token) {
    return NextResponse.json(
      { ok: false, error: 'Falta token' } as ApiUploadResponse,
      { status: 400 }
    );
  }

  const casoId = await getCasoIdFromToken(token);
  if (!casoId) {
    return NextResponse.json(
      { ok: false, error: 'not_found' } as ApiUploadResponse,
      { status: 404 }
    );
  }

  const formData = await req.formData();
  const file = formData.get('file');
  const docId = formData.get('docId')?.toString() ?? 'documento';

  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, error: 'Archivo no recibido' } as ApiUploadResponse,
      { status: 400 }
    );
  }

  const originalName = file.name || 'documento_cliente';
  const ext = originalName.split('.').pop() ?? 'file';
  const path = `${casoId}/${docId}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${ext}`;

  // 1) Subir al bucket usando SERVICE KEY (no hay problema de permisos)
  const { error: uploadError } = await supabaseAdmin
    .storage
    .from(STORAGE_BUCKET)
    .upload(path, file);

  if (uploadError) {
    console.error('Error subiendo archivo en upload route:', uploadError);
    return NextResponse.json(
      { ok: false, error: 'No se ha podido subir el archivo' } as ApiUploadResponse,
      { status: 500 }
    );
  }

  // 2) URL pública
  const { data: publicData } = supabaseAdmin
    .storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(path);

  const publicUrl = publicData?.publicUrl ?? null;
  const labelMensaje = `Documento subido: ${docId}`;

  // 3) Registrar mensaje en expediente_mensajes
  const { data, error } = await supabaseAdmin
    .from('expediente_mensajes')
    .insert({
      caso_id: casoId,
      remitente: 'cliente' as Remitente,
      mensaje: labelMensaje,
      attachment_name: originalName,
      attachment_path: publicUrl,
      storage_path: path,
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
    console.error('Error creando mensaje de archivo:', error);
    return NextResponse.json(
      { ok: false, error: 'Archivo subido pero no registrado' } as ApiUploadResponse,
      { status: 500 }
    );
  }

  // 4) Aviso para tu panel
  const { error: updError } = await supabaseAdmin
    .from('casos')
    .update({ cliente_tiene_mensajes_nuevos: true })
    .eq('id', casoId);

  if (updError) {
    console.error('Error marcando cliente_tiene_mensajes_nuevos en upload:', updError);
  }

  return NextResponse.json(
    { ok: true, mensaje: data } as ApiUploadResponse,
    { status: 201 }
  );
}
