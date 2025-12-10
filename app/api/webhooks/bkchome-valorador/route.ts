import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

function getIp(req: Request) {
  const xf = req.headers.get("x-forwarded-for");
  if (!xf) return null;
  return xf.split(",")[0]?.trim() ?? null;
}

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin");
  const allowed = new Set(["https://bkchome.es", "https://www.bkchome.es"]);
  const allowOrigin = origin ? (allowed.has(origin) ? origin : "https://bkchome.es") : "*";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,x-bkc-webhook-key",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
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

  const step1 = body?.step1 || {};
  const step2 = body?.step2 || {};
  const result = body?.result || null;
  const geo = body?.geo || null;

  if (!step1?.address || !step1?.city || !step2?.name || !step2?.phone) {
    return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400, headers });
  }

  // ✅ UTM nunca NULL
  const utm =
    body?.utm && typeof body.utm === "object" && !Array.isArray(body.utm)
      ? body.utm
      : {};

  const ip = getIp(req);
  const userAgent = req.headers.get("user-agent");

  const row = {
    source: "bkchome_valorador",
    ip,
    user_agent: userAgent,
    utm,
    raw: body,

    // JSON completos
    property: step1,
    contact: step2,
    result,

    // columnas planas
    name: step2?.name ?? null,
    phone: step2?.phone ?? null,
    email: step2?.email ?? null,

    address: step1?.address ?? null,
    city: step1?.city ?? null,
    type: step1?.type ?? null,
    size_m2: step1?.size ? Number(step1.size) : null,
    bedrooms: step1?.bedrooms ? Number(step1.bedrooms) : null,
    bathrooms: step1?.bathrooms ? Number(step1.bathrooms) : null,
    has_garage: step1?.hasGarage === "si",
    has_terrace: step1?.hasTerrace === "si",
    condition: step1?.condition ?? null,

    result_min: result?.minPrice ?? null,
    result_max: result?.maxPrice ?? null,

    lat: geo?.lat != null ? Number(geo.lat) : null,
    lon: geo?.lon != null ? Number(geo.lon) : null,
  };

  const { error } = await supabaseAdmin.from("leads_valorador").insert(row);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500, headers });
  }

  return NextResponse.json({ ok: true }, { status: 200, headers });
}
