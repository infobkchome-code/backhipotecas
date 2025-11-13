// app/api/portal/clients/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET() {
  try {
    // 1) Cargar clientes + su(s) caso(s) relacionados
    const { data, error } = await supabase
      .from('clientes') // <- tabla minúscula
      .select('id, nombre, email, telefono, created_at, casos(*)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error cargando clientes:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // data es algo como: [{ id, nombre, ..., casos: [ {...}, {...} ] }, ...]
    const clientes = (data || []).map((cli: any) => {
      const caso = (cli.casos && cli.casos[0]) || null;

      return {
        id: cli.id,
        nombre: cli.nombre,
        email: cli.email,
        telefono: cli.telefono,
        created_at: cli.created_at,
        caso: caso
          ? {
              id: caso.id,
              estado: caso.estado,
              titulo: caso.titulo,
              progreso: caso.progreso,
              created_at: caso.created_at,
              notas: caso.notas,
            }
          : null,
      };
    });

    return NextResponse.json({ clientes });
  } catch (e: any) {
    console.error('Error inesperado en /api/portal/clients:', e);
    return NextResponse.json(
      { error: e?.message || 'Error interno en el servidor' },
      { status: 500 }
    );
  }
}
