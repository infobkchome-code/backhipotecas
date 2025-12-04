// app/api/seguimiento/[token]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const token = params?.token;

  if (!token) {
    return NextResponse.json({ error: 'Falta el token de seguimiento.' }, { status: 400 });
  }

  // 1) Buscar caso por token
  const { data: caso, error } = await supabaseAdmin
    .from('casos')
    .select('id, titulo, estado, progreso, notas, created_at, updated_at')
    .eq('seguimiento_token', token)
    .single();

  if (error || !caso) {
    console.error('Error cargando expediente por token:', error);
    return NextResponse.json({ error: 'No se ha encontrado el expediente.' }, { status: 404 });
  }

  // 2) Logs visibles cliente
  const { data: logs, error: logsError } = await supabaseAdmin
    .from('expediente_logs')
    .select('id, created_at, tipo, descripcion, visible_cliente')
    .eq('caso_id', caso.id)
    .eq('visible_cliente', true)
    .order('created_at', { ascending: false });

  if (logsError) console.error('Error cargando logs:', logsError);

  // 3) Docs habilitados para cliente (si habilitar_cliente es null → se muestra igual)
  const { data: rows, error: docsError } = await supabaseAdmin
    .from('casos_documentos_requeridos')
    .select(`
      id,
      completado,
      habilitar_cliente,
      doc:documentos_requeridos (
        tipo,
        descripcion,
        obligatorio
      )
    `)
    .eq('caso_id', caso.id);

  if (docsError) console.error('Error cargando docs cliente:', docsError);

  const docs =
    (rows ?? [])
      .filter((r: any) => r.habilitar_cliente !== false) // true o null → mostrar
      .map((r: any) => ({
        id: r.id, // <-- ID de casos_documentos_requeridos
        titulo: r.doc?.descripcion ?? r.doc?.tipo ?? 'Documento',
        obligatorio: Boolean(r.doc?.obligatorio),
        ya_subido: Boolean(r.completado),
      })) ?? [];

  return NextResponse.json({
    data: caso,
    logs: logs ?? [],
    docs,
  });
}
