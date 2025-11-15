import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface Params {
  params: { token: string };
}

export async function GET(_request: Request, { params }: Params) {
  const { token } = params;

  const supabase = createClient();

  const { data, error } = await supabase
    .from("casos") // tu tabla
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
