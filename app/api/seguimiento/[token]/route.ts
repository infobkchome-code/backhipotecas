import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(
  req: Request,
  { params }: { params: { token: string } }
) {
  const token = params.token;

  // 1) Buscar caso por token
  const { data: caso, error: casoError } = await supabase
    .from("casos")
    .select("id")
    .eq("seguimiento_token", token)
    .single();

  if (casoError || !caso) {
    return NextResponse.json(
      { error: "not_found" },
      { status: 404 }
    );
  }

  // 2) Cargar mensajes visibles para el cliente
  const { data: mensajes, error: msgError } = await supabase
    .from("mensajes_cliente")
    .select("*")
    .eq("caso_id", caso.id)
    .eq("visible_para_cliente", true)
    .order("created_at", { ascending: true });

  if (msgError) {
    return NextResponse.json(
      { error: "load_error" },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      mensajes,
    },
    { status: 200 }
  );
}

export async function POST(
  req: Request,
  { params }: { params: { token: string } }
) {
  const token = params.token;
  const body = await req.json();
  const { contenido } = body;

  if (!contenido || contenido.trim().length === 0) {
    return NextResponse.json(
      { error: "empty_message" },
      { status: 400 }
    );
  }

  // 1) Localizar caso
  const { data: caso, error: casoError } = await supabase
    .from("casos")
    .select("id")
    .eq("seguimiento_token", token)
    .single();

  if (casoError || !caso) {
    return NextResponse.json(
      { error: "not_found" },
      { status: 404 }
    );
  }

  // 2) Insertar mensaje (remitente: cliente)
  const { error: insertError } = await supabase
    .from("mensajes_cliente")
    .insert({
      caso_id: caso.id,
      remitente: "cliente",
      contenido,
      visible_para_cliente: true,
    });

  if (insertError) {
    return NextResponse.json(
      { error: "insert_error" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
