import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// GET: lista de mensajes de un caso (gestor)
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const casoId = params.id;

    const { data, error } = await supabase
      .from('expediente_mensajes') // 👈 nombre de la tabla
      .select('*')                 // 👈 seleccionamos todo, sin columnas raras
      .eq('caso_id', casoId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('GET chat error:', error);
      return NextResponse.json(
        { ok: false, error: 'db_error' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: true, messages: data ?? [] },
      { status: 200 }
    );
  } catch (e) {
    console.error('Unexpected GET chat error:', e);
    return NextResponse.json(
      { ok: false, error: 'server_error' },
      { status: 500 }
    );
  }
}

// POST: mensaje nuevo (gestor o cliente)
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const casoId = params.id;

    // ⬇️ Ahora leemos FormData (mensaje + posible archivo)
    const form = await req.formData();
    const mensaje = (form.get('mensaje') as string | null) ?? null;
    const remitente = (form.get('remitente') as string) || 'gestor';
    const file = form.get('file') as File | null;

    if ((!mensaje || mensaje.trim() === '') && !file) {
      return NextResponse.json(
        { ok: false, error: 'missing_message' },
        { status: 400 }
      );
    }

    // 1) Comprobar que el caso existe
    const { data: caso, error: casoError } = await supabase
      .from('casos')
      .select('id')
      .eq('id', casoId)
      .single();

    if (casoError || !caso) {
      console.error('case_not_found POST /portal/chat:', casoError);
      return NextResponse.json(
        { ok: false, error: 'case_not_found' },
        { status: 404 }
      );
    }

    let attachment_name: string | null = null;
    let storage_path: string | null = null;

    // 2) Si hay archivo, lo subimos al bucket "docs"
    if (file) {
      const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const fileName = `${Date.now()}_${cleanName}`;
      const path = `${casoId}/${fileName}`;

      // Supabase acepta Blob/File/ArrayBuffer, no hace falta Buffer
      const { error: uploadError } = await supabase.storage
        .from('docs')
        .upload(path, file, {
          contentType: file.type || 'application/octet-stream',
          upsert: true,
        });

      if (uploadError) {
        console.error('Upload chat file error:', uploadError);
        return NextResponse.json(
          { ok: false, error: 'upload_error' },
          { status: 500 }
        );
      }

      attachment_name = file.name;
      storage_path = path;
    }

    // 3) Guardar mensaje en la tabla expediente_mensajes
    const { data: inserted, error: insertError } = await supabase
      .from('expediente_mensajes')
      .insert({
        caso_id: casoId,
        remitente,
        mensaje: mensaje && mensaje.trim() !== '' ? mensaje.trim() : null,
        attachment_name,
        storage_path,
      })
      .select('*')
      .single();

    if (insertError) {
      console.error('Insert chat message error:', insertError);
      return NextResponse.json(
        { ok: false, error: 'db_error' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: true, message: inserted },
      { status: 200 }
    );
  } catch (e) {
    console.error('Unexpected POST chat error:', e);
    return NextResponse.json(
      { ok: false, error: 'server_error' },
      { status: 500 }
    );
  }
}
