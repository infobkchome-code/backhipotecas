import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

export async function GET(
  _req: Request,
  context: { params: { token: string } }
) {
  const token = context.params.token;

  try {
    // 1) Buscar el expediente por token
    const { data: caso, error } = await supabase
      .from('casos')
      .select(
        'id, titulo, estado, progreso, notas, created_at, updated_at, seguimiento_token'
      )
      .eq('seguimiento_token', token)
      .maybeSingle();

    if (error) {
      console.error('Error Supabase seguimiento:', error);
      return NextResponse.json(
        { error: 'db_error' },
        { status: 500 }
      );
    }

    if (!caso) {
      return NextResponse.json(
        { error: 'not_found' },
        { status: 404 }
      );
    }

    // 2) Logs visibles para cliente
    const { data: logs, error: logsError } = await supabase
      .from('expediente_logs')
      .select('id, created_at, tipo, descripcion')
      .eq('caso_id', (caso as any).id)
      .eq('visible_cliente', true)
      .order('created_at', { ascending: true });

    if (logsError) {
      console.error('Error cargando logs seguimiento:', logsError);
    }

    return NextResponse.json(
      {
        data: caso,
        logs: logs ?? [],
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('Error inesperado en /api/seguimiento/[token]:', err);
    return NextResponse.json(
      { error: 'unexpected' },
      { status: 500 }
    );
  }
}
