import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, { auth: { persistSession: false } });
}

function ipFrom(req: NextRequest) {
  const xf = req.headers.get("x-forwarded-for") || "";
  return xf.split(",")[0]?.trim() || null;
}

export async function POST(req: NextRequest) {
  try {
    const sp = new URL(req.url).searchParams;

    const secret =
      req.headers.get("x-bkc-webhook-key") ||
      sp.get("key") ||
      "";

    if (!process.env.BKC_WEBHOOK_KEY || secret !== process.env.BKC_WEBHOOK_KEY) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const step1 = body?.step1 ?? {};
    const step2 = body?.step2 ?? {};
    const result = body?.result ?? {};
    const utm = body?.utm ?? {};
    const geo = body?.geo ?? null;

    const payload: any = {
      source: body?.source || "bkchome_valorador",

      name: String(step2?.name || ""),
      phone: String(step2?.phone || ""),
      email: String(step2?.email || ""),

      address: String(step1?.address || ""),
      city: String(step1?.city || ""),
      type: String(step1?.type || ""),
      size_m2: step1?.size ? Number(step1.size) : null,
      bedrooms: step1?.bedrooms ? Number(step1.bedrooms) : null,
      bathrooms: step1?.bathrooms ? Number(step1.bathrooms) : null,
      has_garage: step1?.hasGarage === "si",
      has_terrace: step1?.hasTerrace === "si",
      condition: String(step1?.condition || ""),

      result_min: result?.minPrice ? Number(result.minPrice) : null,
      result_max: result?.maxPrice ? Number(result.maxPrice) : null,

      lat: geo?.lat ? Number(geo.lat) : null,
      lon: geo?.lon ? Number(geo.lon) : null,

      utm,
      property: step1,
      contact: step2,
      result,

      ip: ipFrom(req),
      user_agent: req.headers.get("user-agent") || null,

      status: "new",
      raw: body,
    };

    const sb = admin();
    const { error } = await sb.from("leads_valorador").insert(payload);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
