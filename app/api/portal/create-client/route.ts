import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabaseClient';

export async function POST(req: Request) {
  const data = await req.json();
  const { nombre, email } = data;

  const { error } = await supabase.from('clientes').insert([{ nombre, email }]);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ message: 'Cliente creado correctamente' });
}

