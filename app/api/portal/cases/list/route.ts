import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('casos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error Supabase /cases/list:', error);
      return NextResponse.json(
        { error: 'Error al obtener los expedientes' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (err) {
    console.error('Error inesperado en /api/portal/cases/list:', err);
    return NextResponse.json(
      { error: 'Error inesperado al obtener los expedientes' },
      { status: 500 }
    );
  }
}
