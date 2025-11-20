import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const casoId = params.id;

    const { data, error } = await supabase
      .from('expediente_mensajes')
      .select(
        `
        id,
        caso_id,
        remitente,
        mensaje,
        attachment_name,
        storage_path,
        created_at
      `
      )
      .eq('caso_id', casoId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('GET chat error:', error);
      return NextResponse.json({ ok: false, error: 'db_error' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, messages: data ?? [] }, { status: 200 });
  } catch (e) {
    console.error('Unexpected GET chat error:', e);
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const casoId = params.id;

    // ⬅️ Aquí está la clave: recibir FormData
    const form = await req.formData();
    const mensaje = form.get('mensaje') as string | null;
    const remitente = (form.get('remitente') as string) || 'gestor';
    const file = form.get('file') as File | null;

    if ((!mensaje || mensaje.trim() === '') && !file) {
      return NextResponse.json(
        { ok: false, error: 'missing_message' },
        { status: 400 }
      );
    }

    // 1) Confirmar caso existe
    const { data: caso, error: casoError } = await supabase
      .from('casos')
      .select('id')
      .eq('id', casoId)
      .single();

    if (casoError || !caso) {
      return NextResponse.json(
        { ok: false, error: 'case_not_found' },
        { status: 404 }
      );
    }

    let attachment_name: string | null = null;
    let storage_path: string | null = null;

    // 2) Si hay archivo → subirlo
    if (file) {
      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const path = `${casoId}/${fileName}`;

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { error: uploadError } = await supabase.storage
        .from('docs')
        .upload(path, buffer, {
          contentType: file.type,
          upsert: true,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return NextResponse.json(
          { ok: false, error: 'upload_error' },
          { status: 500 }
        );
      }

      attachment_name = file.name;
      storage_path = path;
    }

    // 3) Insertar mensaje
    const { data: inserted, error: insertError } = await supabase
      .from('expediente_mensajes')
      .insert({
        caso_id: casoId,
        remitente,
        mensaje: mensaje ?? null,
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
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}
