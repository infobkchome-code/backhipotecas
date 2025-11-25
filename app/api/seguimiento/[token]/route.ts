// app/api/seguimiento/[token]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const token = params?.token;

  if (!token) {
    return NextResponse.json(
      { error: 'Falta el token de seguimiento.' },
      { status: 400 }
    );
  }

  // 1) Buscar el caso por el seguimiento_token en la tabla CASOS
  const { data: caso, error } = await supabaseAdmin
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

  if (error || !caso) {
    console.error('Error cargando expediente por token:', error);
    return NextResponse.json(
      { error: 'No se ha encontrado el expediente.' },
      { status: 404 }
    );
  }

  // 2) Logs visibles para el cliente
  const { data: logs, error: logsError } = await supabaseAdmin
    .from('expediente_logs')
    .select('id, created_at, tipo, descripcion, visible_cliente')
    .eq('caso_id', caso.id)
    .eq('visible_cliente', true)
    .order('created_at', { ascending: false });

  if (logsError) {
    console.error('Error cargando logs de expediente:', logsError);
  }

  return NextResponse.json({
    data: {
      id: caso.id,
      titulo: caso.titulo,
      estado: caso.estado,
      progreso: caso.progreso,
      notas: caso.notas,
      created_at: caso.created_at,
      updated_at: caso.updated_at,
    },
    logs: logs ?? [],
  });
}
