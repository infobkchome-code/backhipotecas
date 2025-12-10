import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, { auth: { persistSession: false } });
}

function getIp(req: Request) {
  const xf = req.headers.get("x-forwarded-for");
  if (!xf) return null;
  return xf.split(",")[0]?.trim() ?? null;
}

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin"); // puede ser null en server-to-server
  const allowed = new Set([
    "https://bkchome.es",
    "https://www.bkchome.es",
  ]);

  // Si no hay origin (llamada entre servidores), no hace falta CORS estricto
  const allowOrigin = origin ? (allowed.has(origin) ? origin : "https://bkchome.es") : "*";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,x-bkc-webhook-key",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

export async function POST(req: Request) {
  const headers = corsHeaders(req);

  const secret = req.headers.get("x-bkc-webhook-key") ?? "";
  const expected = process.env.BKC_WEBHOOK_KEY ?? "";

  if (!expected || secret !== expected) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401, headers });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400, headers });
  }

  const step1 = body?.step1;
  const step2 = body?.step2;
  const result = body?.result ?? null;

  if (!step1?.address || !step1?.city || !step2?.name || !step2?.phone) {
    return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400, headers });
  }

  const sb = supabaseAdmin();
  const ip = getIp(req);
  const userAgent = req.headers.get("user-agent");

  const { error } = await sb.from("leads_valorador").insert({
    source: "bkchome_valorador",
    property: step1,
    contact: step2,
    result,
    utm: body?.utm ?? null,
    ip,
    user_agent: userAgent,
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500, headers });
  }

  return NextResponse.json({ ok: true }, { status: 200, headers });
}
