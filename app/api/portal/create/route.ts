// app/api/portal/create/route.ts

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      userId,
      nombre,
      email,
      telefono,
      notas,
      titulo,
    } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "Falta userId" },
        { status: 400 }
      );
    }

    if (!nombre || !email) {
      return NextResponse.json(
        { error: "Faltan datos del cliente" },
        { status: 400 }
      );
    }

    // 🔹 1. Crear el cliente
    const { data: cliente, error: errorCliente } = await supabase
      .from("clientes")
      .insert([
        {
          user_id_uuid: userId,
          nombre,
          email,
          telefono: telefono || null,
        },
      ])
      .select()
      .single();

    if (errorCliente) {
      console.error("Error creando cliente:", errorCliente);
      return NextResponse.json(
        { error: "Error creando cliente" },
        { status: 500 }
      );
    }

    // 🔹 2. Generar token único para seguimiento
    const seguimientoToken = randomUUID();

    // 🔹 3. Crear caso asociado
    const { data: caso, error: errorCaso } = await supabase
      .from("casos")
      .insert([
        {
          user_id_uuid: userId,
          client_id_uuid: cliente.id,
          titulo: titulo || `Expediente ${nombre}`,
          estado: "en_estudio",
          progreso: 0,
          notas_internas: notas || "",
          seguimiento_token: seguimientoToken, // ⬅ AQUÍ SE GUARDA
        },
      ])
      .select()
      .single();

    if (errorCaso) {
      console.error("Error creando caso:", errorCaso);
      return NextResponse.json(
        { error: "Error creando caso" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        cliente,
        caso,
        seguimiento_url: `https://backhipotecas.vercel.app/seguimiento/${seguimientoToken}`,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("ERROR en /api/portal/create:", err);
    return NextResponse.json(
      { error: "Error interno" },
      { status: 500 }
    );
  }
}
