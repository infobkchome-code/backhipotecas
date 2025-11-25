import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// GET /api/seguimiento/[token]
export async function GET(
  _req: Request,
  { params }: { params: { token: string } }
) {
  const token = params?.token;

  if (!token) {
    return NextResponse.json(
      { error: 'Token de seguimiento no proporcionado.' },
      { status: 400 }
    );
  }

  // 1) Buscar el caso por seguimiento_token
  const { data: caso, error: casoError } = await supabaseAdmin
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

  if (casoError || !caso) {
    console.error('Error buscando caso por token:', casoError);
    return NextResponse.json(
      { error: 'No hemos encontrado ningún expediente asociado a este enlace.' },
      { status: 404 }
    );
  }

  // 2) Logs visibles para el cliente
  const { data: logs, error: logsError } = await supabaseAdmin
    .from('expediente_logs')
    .select('id, created_at, tipo, descripcion')
    .eq('caso_id', caso.id)
    .eq('visible_cliente', true)
    .order('created_at', { ascending: false });

  if (logsError) {
    console.error('Error cargando logs de seguimiento:', logsError);
  }

  return NextResponse.json(
    {
      data: {
        id: caso.id,
        titulo: caso.titulo,
        estado: caso.estado,
        progreso: caso.progreso ?? 0,
        notas: caso.notas,
        created_at: caso.created_at,
        updated_at: caso.updated_at,
      },
      logs: logs || [],
    },
    { status: 200 }
  );
}
