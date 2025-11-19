import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: Request) {
  const body = await req.json();
  const { caso_id, contenido } = body;

  if (!caso_id || !contenido) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const user_id = auth.user.id;

  const { error } = await supabase.from('expediente_notas').insert({
    caso_id,
    user_id,
    contenido,
  });

  if (error) {
    console.error(error);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
