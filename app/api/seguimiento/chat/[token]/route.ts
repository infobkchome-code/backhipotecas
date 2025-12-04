import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function getCasoIdByToken(token: string) {
  const { data, error } = await supabaseAdmin
    .from('casos')
    .select('id')
    .eq('seguimiento_token', token)
    .single();

  if (error || !data) return null;
  return data.id as string;
}

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const token = params.token;

  const casoId = await getCasoIdByToken(token);
  if (!casoId) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin
    .from('expediente_mensajes')
    .select('id, caso_id, remitente, mensaje, attachment_name, attachment_path, storage_path, created_at')
    .eq('caso_id', casoId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error GET chat cliente:', error);
    return NextResponse.json({ ok: false, error: 'No se pudieron cargar los mensajes' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, mensajes: data ?? [] });
}

export async function POST(req: Request, { params }: { params: { token: string } }) {
  const token = params.token;
  const casoId = await getCasoIdByToken(token);

  if (!casoId) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const mensaje: string | null = body.mensaje ?? null;

  if (!mensaje || mensaje.trim().length === 0) {
    return NextResponse.json({ ok: false, error: 'El mensaje está vacío' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('expediente_mensajes')
    .insert({
      caso_id: casoId,
      remitente: 'cliente',
      mensaje: mensaje.trim(),
    })
    .select('id, caso_id, remitente, mensaje, attachment_name, attachment_path, storage_path, created_at')
    .single();

  if (error) {
    console.error('Error POST chat cliente:', error);
    return NextResponse.json({ ok: false, error: 'No se pudo guardar el mensaje' }, { status: 500 });
  }

  // marca “hay mensajes nuevos”
  await supabaseAdmin.from('casos').update({ cliente_tiene_mensajes_nuevos: true }).eq('id', casoId);

  return NextResponse.json({ ok: true, mensaje: data });
}
