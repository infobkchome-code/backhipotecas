// app/api/seguimiento/[token]/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type SeguimientoCaso = {
  id: string;
  titulo: string;
  estado: string;
  progreso: number;
  notas: string | null;
  created_at: string;
  updated_at: string;
};

type LogItem = {
  id: string;
  created_at: string;
  tipo: string;
  descripcion: string | null;
};

type ClienteDoc = {
  id: string;
  titulo: string;
  obligatorio: boolean;
  ya_subido: boolean;
};

export async function GET(
  _req: Request,
  { params }: { params: { token: string } }
) {
  const { token } = params;

  if (!token) {
    return NextResponse.json(
      { error: 'Token no proporcionado.' },
      { status: 400 }
    );
  }

  // 1) Buscar el caso por seguimiento_token
  const { data: casoDb, error: casoError } = await supabaseAdmin
    .from('casos')
    .select(
      `
      id,
      titulo,
      estado,
      progreso,
      notas,
      created_at,
      updated_at
    `
    )
    .eq('seguimiento_token', token)
    .single();

  if (casoError || !casoDb) {
    console.error('Error cargando caso seguimiento:', casoError);
    return NextResponse.json(
      {
        error:
          'No hemos encontrado ningún expediente asociado a este enlace.',
      },
      { status: 404 }
    );
  }

  const caso: SeguimientoCaso = {
    id: casoDb.id,
    titulo: casoDb.titulo ?? 'Expediente sin título',
    estado: casoDb.estado ?? 'en_estudio',
    progreso: casoDb.progreso ?? 0,
    notas: casoDb.notas ?? null,
    created_at: casoDb.created_at,
    updated_at: casoDb.updated_at,
  };

  // 2) Logs visibles para el cliente
  const { data: logsDb, error: logsError } = await supabaseAdmin
    .from('expediente_logs')
    .select('id, created_at, tipo, descripcion, visible_cliente')
    .eq('caso_id', caso.id)
    .eq('visible_cliente', true)
    .order('created_at', { ascending: false });

  if (logsError) {
    console.error('Error cargando logs seguimiento:', logsError);
  }

  const logs: LogItem[] =
    (logsDb || []).map((l: any) => ({
      id: l.id,
      created_at: l.created_at,
      tipo: l.tipo,
      descripcion: l.descripcion,
    })) ?? [];

  // 3) Documentos configurados para el cliente
  //    usamos la tabla casos_documentos_requeridos + documentos_requeridos
  const { data: docsDb, error: docsError } = await supabaseAdmin
    .from('casos_documentos_requeridos')
    .select(
      `
      id,
      completado,
      habilitar_cliente,
      doc:documentos_requeridos (
        tipo,
        descripcion,
        obligatorio
      )
    `
    )
    .eq('caso_id', caso.id)
    .eq('habilitar_cliente', true);

  if (docsError) {
    console.error('Error cargando docs seguimiento:', docsError);
  }

  const docs: ClienteDoc[] =
    (docsDb || []).map((row: any) => {
      const titulo =
        row.doc?.descripcion ||
        row.doc?.tipo ||
        'Documento';

      return {
        id: row.id,
        titulo,
        obligatorio: row.doc?.obligatorio ?? false,
        ya_subido: row.completado ?? false, // de momento usamos "completado"
      };
    }) ?? [];

  return NextResponse.json({
    data: caso,
    logs,
    docs,
  });
}
