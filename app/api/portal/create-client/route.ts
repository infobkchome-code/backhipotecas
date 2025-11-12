import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: Request) {
  try {
    // 1️⃣ Obtener datos enviados desde el frontend
    const data = await req.json();
    const { nombre, email, telefono } = data;

    // 2️⃣ Obtener el usuario autenticado actual
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Usuario no autenticado' },
        { status: 401 }
      );
    }

    // 3️⃣ Insertar cliente asociado al user_id
    const { error: insertError } = await supabase
      .from('clientes')
      .insert([
        {
          user_id: user.id,
          nombre,
          email,
          telefono,
        },
      ]);

    if (insertError) {
      console.error('Error al crear cliente:', insertError);
      return NextResponse.json(
        { error: insertError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: 'Cliente creado correctamente',
    });
  } catch (e: any) {
    console.error('Error inesperado:', e);
    return NextResponse.json(
      { error: 'Error en el servidor', details: e.message },
      { status: 500 }
    );
  }
}
