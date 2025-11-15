import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient"; // 👈 IMPORTANTE: este import

interface Params {
  params: { token: string };
}

export async function GET(_request: Request, { params }: Params) {
  const { token } = params;

  // Usamos directamente el cliente supabase que ya tienes
  const { data, error } = await supabase
    .from("casos")
    .select("*")
    .eq("seguimiento_token", token)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { message: "Enlace de seguimiento no válido" },
      { status: 404 }
    );
  }

  return NextResponse.json({ expediente: data }, { status: 200 });
}
