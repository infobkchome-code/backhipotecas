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

// 👉 MISMO bucket que usas en el panel interno
const STORAGE_BUCKET = 'docs';

// helper: buscar caso por token
async function getCasoByToken(token: string) {
  const { data, error } = await supabaseAdmin
    .from('casos')
    .select('id, titulo')
    .eq('seguimiento_token', token)
    .single();

  if (error || !data) return null;
  return data as { id: string; titulo: string | null };
}

// mapear el docId del portal cliente al tipo usado en el checklist (modo legacy)
function mapDocIdToTipo(docId: string | null): string | null {
  if (!docId) return null;

  switch (docId) {
    case 'dni_comprador':
    case 'dni_cliente':
      return 'dni';
    case 'nominas_3m':
      return 'nominas';
    case 'contrato_trabajo':
      return 'contrato_trabajo';
    case 'vida_laboral':
      return 'vida_laboral';
    case 'renta':
      return 'renta';
    case 'extractos_6m':
    case 'extractos_3_6m':
      return 'extractos';
    default:
      return null;
  }
}

// Detectar UUID (docId nuevo = id de casos_documentos_requeridos)
function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

// Resolver doc tipo real a partir del checklist row id (casos_documentos_requeridos.id)
async function resolveDocTipoFromChecklistRow(casoId: string, checklistRowId: string) {
  const { data, error } = await supabaseAdmin
    .from('casos_documentos_requeridos')
    .select(
      `
      id,
      doc:documentos_requeridos (
        tipo
      )
    `
    )
    .eq('id', checklistRowId)
    .eq('caso_id', casoId)
    .single();

  if (error || !data) return null;

  return {
    checklistRowId: data.id as string,
    tipo: (data as any).doc?.tipo as string | null,
  };
}

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const token = params.token;

  if (!token) {
    return NextResponse.json({ ok: false, error: 'Falta token en la URL' }, { status: 400 });
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
    return NextResponse.json({ ok: false, error: 'No se ha recibido ningún archivo' }, { status: 400 });
  }

  const originalName = file.name || 'documento.pdf';

  // 3) Nombre y ruta seguros
  const safeName = originalName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9.\-_]/g, '_');

  const timestamp = Date.now();

  // --------- NUEVO: si docId es UUID => es el ID correcto del checklist ----------
  let folder = docId || 'otros';
  let docTipo = mapDocIdToTipo(docId) || docId || 'otros';
  let checklistRowId: string | null = null;

  if (docId && isUuid(docId)) {
    const resolved = await resolveDocTipoFromChecklistRow(caso.id, docId);
    if (resolved?.tipo) {
      docTipo = resolved.tipo;
      folder = resolved.tipo; // carpeta bonita por tipo
      checklistRowId = resolved.checklistRowId;
    } else {
      // si no se pudo resolver, igualmente guardamos el UUID como folder (pero evitamos crashear)
      folder = docId;
      docTipo = 'otros';
      checklistRowId = docId;
    }
  }

  const storagePath = `${caso.id}/${folder}/${timestamp}-${safeName}`;

  // 4) Subir al bucket con SERVICE KEY (bucket: docs)
  const { error: uploadError } = await supabaseAdmin.storage.from(STORAGE_BUCKET).upload(storagePath, file);

  if (uploadError) {
    console.error('❌ Error subiendo archivo cliente:', uploadError);
    return NextResponse.json({ ok: false, error: 'No se ha podido subir el archivo.' }, { status: 500 });
  }

  // 5) Obtener URL pública
  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);

  // 6) Guardar metadatos en expediente_documentos
  const { error: docError } = await supabaseAdmin.from('expediente_documentos').insert({
    caso_id: caso.id,
    user_id: null, // viene del portal cliente
    tipo: docTipo,
    nombre_archivo: originalName,
    storage_path: storagePath,
  });

  if (docError) {
    console.error('❌ Error guardando metadatos documento cliente:', docError);
  }

  // 7) Crear log de movimiento
  const descripcionLog = `Documento (${docTipo}) subido por el cliente: ${originalName}`;

  const { error: logError } = await supabaseAdmin.from('expediente_logs').insert({
    caso_id: caso.id,
    user_id: null,
    tipo: 'documento_cliente',
    descripcion: descripcionLog,
    visible_cliente: true,
  });

  if (logError) {
    console.error('❌ Error creando log de documento cliente:', logError);
  }

  // 8) Marcar checklist (NUEVO)
  if (checklistRowId) {
    // marca SOLO el ítem exacto
    const { error: updErr } = await supabaseAdmin
      .from('casos_documentos_requeridos')
      .update({
        completado: true,
        completado_por: null,
        completado_en: new Date().toISOString(),
      })
      .eq('id', checklistRowId)
      .eq('caso_id', caso.id);

    if (updErr) {
      console.error('❌ Error marcando checklist por ID:', updErr);
    }
  } else {
    // fallback legacy por tipo (por si algún flujo aún manda docId tipo "dni_cliente")
    const tipoChecklist = mapDocIdToTipo(docId);

    if (tipoChecklist) {
      const { data: checklistRows, error: checklistError } = await supabaseAdmin
        .from('casos_documentos_requeridos')
        .select(
          `
          id,
          completado,
          doc:documentos_requeridos (
            tipo
          )
        `
        )
        .eq('caso_id', caso.id);

      if (!checklistError && checklistRows) {
        const pendientes = (checklistRows as any[]).filter(
          (row) => !row.completado && row.doc?.tipo === tipoChecklist
        );

        for (const row of pendientes) {
          await supabaseAdmin
            .from('casos_documentos_requeridos')
            .update({
              completado: true,
              completado_por: null,
              completado_en: new Date().toISOString(),
            })
            .eq('id', row.id);
        }
      } else if (checklistError) {
        console.error('❌ Error leyendo checklist para marcar:', checklistError);
      }
    }
  }

  // 9) Crear mensaje de chat asociado
  const mensajeTexto = docTipo ? `Documento subido: ${docTipo}` : 'Documento subido por el cliente';

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
        error: 'El archivo se ha subido, pero no se ha registrado correctamente el mensaje.',
      },
      { status: 500 }
    );
  }

  // 10) Marcar que hay mensaje nuevo del cliente en la tabla casos
  await supabaseAdmin.from('casos').update({ cliente_tiene_mensajes_nuevos: true }).eq('id', caso.id);

  return NextResponse.json({ ok: true, mensaje: mensajeRow }, { status: 200 });
}
