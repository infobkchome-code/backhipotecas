import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

// GET → obtener todos los mensajes del expediente (cliente + gestor)
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const casoId = params.id;

  // 1) Cargar mensajes
  const { data: mensajes, error } = await supabase
    .from("mensajes_cliente")
    .select("*")
    .eq("caso_id", casoId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error cargando mensajes:", error);
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

// POST → enviar mensaje como gestor
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const casoId = params.id;
  const body = await req.json();
  const { contenido, interno } = body;

  if (!contenido || contenido.trim().length === 0) {
    return NextResponse.json(
      { error: "empty_message" },
      { status: 400 }
    );
  }

  // Si "interno" es true → mensaje privado
  // Si es false → cliente lo verá
  const visible = interno ? false : true;

  const { error: insertError } = await supabase
    .from("mensajes_cliente")
    .insert({
      caso_id: casoId,
      remitente: "gestor",
      contenido,
      visible_para_cliente: visible,
    });

  if (insertError) {
    console.error("Error insertando mensaje:", insertError);
    return NextResponse.json(
      { error: "insert_error" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

