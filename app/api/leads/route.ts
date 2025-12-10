// app/api/valorador/bkchome/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { persistSession: false },
  }
);

const ALLOWED_ORIGINS = [
  "https://bkchome.vercel.app",
  "https://bkchome.es",
  "http://localhost:3000",
];

function withCors(req: NextRequest, res: NextResponse) {
  const origin = req.headers.get("origin") || "";
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.headers.set("Access-Control-Allow-Origin", origin);
  }
  res.headers.set("Vary", "Origin");
  res.headers.set("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  res.headers.set("Access-Control-Allow-Credentials", "true");
  return res;
}

export async function OPTIONS(req: NextRequest) {
  const res = NextResponse.json({}, { status: 200 });
  return withCors(req, res);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { step1, step2, result } = body || {};

    if (!step2?.phone) {
      const res = NextResponse.json(
        { ok: false, error: "Falta teléfono" },
        { status: 400 }
      );
      return withCors(req, res);
    }

    // 🔹 Inserta en una tabla genérica de leads del valorador
    const { error } = await supabase.from("web_valorador_leads").insert({
      source: "bkchome_valorador",
      created_at: new Date().toISOString(),
      nombre: step2?.name ?? null,
      telefono: step2?.phone ?? null,
      email: step2?.email ?? null,
      ciudad: step1?.city ?? null,
      direccion: step1?.address ?? null,
      m2: step1?.size ? Number(step1.size) : null,
      datos_vivienda: step1 ?? null,
      datos_contacto: step2 ?? null,
      resultado: result ?? null,
    });

    if (error) {
      console.error("Error Supabase valorador:", error);
      const res = NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
      return withCors(req, res);
    }

    const res = NextResponse.json({ ok: true }, { status: 200 });
    return withCors(req, res);
  } catch (err: any) {
    console.error("Error en endpoint valorador:", err);
    const res = NextResponse.json(
      { ok: false, error: "Error inesperado" },
      { status: 500 }
    );
    return withCors(req, res);
  }
}
