// app/api/portal/clients/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error en /api/portal/clients:', error);
      return NextResponse.json(
        { error: 'No se han podido cargar los clientes.' },
        { status: 500 },
      );
    }

    return NextResponse.json({ clientes: data ?? [] }, { status: 200 });
  } catch (err) {
    console.error('Error inesperado en /api/portal/clients:', err);
    return NextResponse.json(
      { error: 'Error inesperado en el servidor.' },
      { status: 500 },
    );
  }
}
