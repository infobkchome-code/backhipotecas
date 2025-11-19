import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

/**
 * GET → obtener todos los mensajes del chat de un caso
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const casoId = params.id;

  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("caso_id", casoId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error GET chat:", error);
    return NextResponse.json(
      { error: "No se pudieron cargar los mensajes" },
      { status: 500 }
    );
  }

  return NextResponse.json({ messages: data });
}

/**
 * POST → enviar mensaje al chat
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const casoId = params.id;
  const body = await req.json();

  const { sender, mensaje } = body;

  if (!sender || !["cliente", "gestor"].includes(sender)) {
    return NextResponse.json(
      { error: "Remitente no válido" },
      { status: 400 }
    );
  }

  if (!mensaje || mensaje.trim().length === 0) {
    return NextResponse.json(
      { error: "El mensaje no puede estar vacío" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      caso_id: casoId,
      sender,
      mensaje: mensaje.trim(),
    })
    .select()
    .single();

  if (error) {
    console.error("Error POST chat:", error);
    return NextResponse.json(
      { error: "No se pudo guardar el mensaje" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, message: data });
}
