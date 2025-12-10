import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

// CORS (porque esto lo va a pedir bkchome.es desde el navegador)
const ALLOWED_ORIGINS = [
  "https://bkchome.es",
  "https://bkchome.vercel.app",
  "http://localhost:3000",
];

function withCors(req: NextRequest, res: NextResponse) {
  const origin = req.headers.get("origin") || "";
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.headers.set("Access-Control-Allow-Origin", origin);
  }
  res.headers.set("Vary", "Origin");
  res.headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return res;
}

export async function OPTIONS(req: NextRequest) {
  return withCors(req, NextResponse.json({}, { status: 200 }));
}

export async function GET(req: NextRequest) {
  const { data, error } = await supabase
    .from("valorador_config")
    .select("config, updated_at")
    .eq("id", 1)
    .single();

  const res = NextResponse.json({ ok: !error, data: data?.config ?? null });
  return withCors(req, res);
}

export async function POST(req: NextRequest) {
  const token = process.env.VALORADOR_ADMIN_TOKEN || "";
  const auth = req.headers.get("authorization") || "";

  if (!token || auth !== `Bearer ${token}`) {
    const res = NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    return withCors(req, res);
  }

  const body = await req.json();
  const config = body?.config;

  if (!config || typeof config !== "object") {
    const res = NextResponse.json({ ok: false, error: "Config inválida" }, { status: 400 });
    return withCors(req, res);
  }

  const { error } = await supabase.from("valorador_config").upsert({
    id: 1,
    config,
    updated_at: new Date().toISOString(),
  });

  const res = NextResponse.json({ ok: !error, error: error?.message ?? null });
  return withCors(req, res);
}
