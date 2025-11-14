import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: Request) {
  try {
    const { cliente_id } = await req.json();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

   const { data, error } = await supabase
  .from('casos')
  .select(`
    id,
    user_id_uuid,
    client_id_uuid,
    titulo,
    estado,
    progreso,
    notas_internas,
    seguimiento_token,   -- ⬅ NUEVO
    created_at,
    updated_at,
    clientes:clientes (
      id,
      nombre,
      email,
      telefono
    )
  `)
  .order('created_at', { ascending: false });


    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ cases: data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Error' }, { status: 500 });
  }
}

