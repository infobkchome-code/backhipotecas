import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

// 👉 Pega aquí tu UUID de auth.users.id
const FALLBACK_USER_ID = "7efac488-1535-4784-b888-79554da1b5d5";

export async function POST(req: Request) {
  try {
    const { nombre, email, telefono } = await req.json();

    if (!nombre || !email) {
      return NextResponse.json(
        { error: "Nombre y email son obligatorios." },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("clientes").insert({
      user_id: FALLBACK_USER_ID, // de momento siempre tú
      nombre,
      email,
      telefono: telefono || null,
    });

    if (error) {
      console.error("Error Supabase:", error);
      return NextResponse.json(
        { error: error.message || "Error creando el cliente" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Cliente creado correctamente" },
      { status: 200 }
    );
  } catch (e: any) {
    console.error("Error en create-client:", e);
    return NextResponse.json(
      { error: "Error inesperado en el servidor" },
      { status: 500 }
    );
  }
}
