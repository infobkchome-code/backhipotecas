// app/api/portal/clients/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    // 1) Clientes
    const { data: clientes, error: errClientes } = await supabase
      .from('clientes') // <-- minúscula
      .select('*')
      .order('created_at', { ascending: false });

    if (errClientes) {
      console.error('Error cargando clientes:', errClientes);
      return NextResponse.json(
        { error: errClientes.message },
        { status: 500 }
      );
    }

    if (!clientes || clientes.length === 0) {
      return NextResponse.json({ clientes: [] });
    }

    // 2) Casos
    const { data: casos, error: errCasos } = await supabase
      .from('casos')
      .select('*');

    if (errCasos) {
      console.error('Error cargando casos:', errCasos);
      return NextResponse.json(
        { error: errCasos.message },
        { status: 500 }
      );
    }

    const casosMap = new Map<string, any>();
    (casos || []).forEach((c) => {
      // nos quedamos con 1 caso por cliente (el más reciente si hay varios)
      const existente = casosMap.get(c.cliente_id);
      if (!existente || new Date(c.created_at) > new Date(existente.created_at)) {
        casosMap.set(c.cliente_id, c);
      }
    });

    // 3) Combinamos
    const resultado = clientes.map((cli) => {
      const caso = casosMap.get(cli.id) || null;
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

    return NextResponse.json({ clientes: resultado });
  } catch (e: any) {
    console.error('Error inesperado en /api/portal/clients:', e);
    return NextResponse.json(
      { error: 'Error interno en el servidor' },
      { status: 500 }
    );
  }
}
