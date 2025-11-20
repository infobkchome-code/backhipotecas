import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

type CasoRow = {
  id: string;
  titulo: string | null;
  estado: string | null;
  progreso: number | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
  seguimiento_token: string | null;
};

export async function GET(
  _req: Request,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token;

    // 1) Buscar el caso por el token de seguimiento
    const { data: caso, error: casoError } = await supabase
      .from('casos')
      .select(
        `
        id,
        titulo,
        estado,
        progreso,
        notas,
        created_at,
        updated_at,
        seguimiento_token
      `
      )
      .eq('seguimiento_token', token)
      .single<CasoRow>();

    if (casoError || !caso) {
      console.error('Caso no encontrado para token:', token, casoError);
      return NextResponse.json(
        { error: 'not_found' },
        { status: 404 }
      );
    }

    // 2) Cargar sólo los logs visibles para el cliente
    const { data: logs, error: logsError } = await supabase
      .from('expediente_logs')
      .select('id, created_at, tipo, descripcion')
      .eq('caso_id', caso.id)
      .eq('visible_cliente', true)
      .order('created_at', { ascending: true });

    if (logsError) {
      console.error('Error cargando logs seguimiento:', logsError);
      return NextResponse.json(
        { error: 'logs_error' },
        { status: 500 }
      );
    }

    // 3) Normalizar respuesta para el front
    const respuesta = {
      id: caso.id,
      titulo: caso.titulo ?? 'Tu expediente hipotecario',
      estado: caso.estado ?? 'en_estudio',
      progreso: caso.progreso ?? 0,
      notas: caso.notas ?? null,
      created_at: caso.created_at,
      updated_at: caso.updated_at,
    };

    return NextResponse.json(
      { data: respuesta, logs: logs ?? [] },
      { status: 200 }
    );
  } catch (e) {
    console.error('Error inesperado en GET /api/seguimiento/[token]:', e);
    return NextResponse.json(
      { error: 'server_error' },
      { status: 500 }
    );
  }
}
