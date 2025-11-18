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
    const { data, error } = await supabase
      .from('casos')
      .select(
        'id, titulo, estado, progreso, notas, created_at, updated_at, seguimiento_token'
      )
      .eq('seguimiento_token', token)
      .maybeSingle();

    if (error) {
      console.error('Error Supabase seguimiento:', error);
      return NextResponse.json(
        { error: 'Error al buscar el expediente' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'not_found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (err) {
    console.error('Error inesperado en /api/seguimiento/[token]:', err);
    return NextResponse.json(
      { error: 'unexpected' },
      { status: 500 }
    );
  }
}
