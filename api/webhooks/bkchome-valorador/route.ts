import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function supabaseAdmin() {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "";
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key") || "";
    if (!process.env.BKC_WEBHOOK_KEY || key !== process.env.BKC_WEBHOOK_KEY) {
      return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const step1 = body?.step1 ?? {};
    const step2 = body?.step2 ?? {};
    const result = body?.result ?? {};
    const geo = body?.geo ?? null;

    const payload = {
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
      raw: body,
    };

    const sb = supabaseAdmin();
    const { error } = await sb.from("leads_valorador").insert(payload);

    if (error) {
      return Response.json({ ok: false, error: error.message }, { status: 400 });
    }

    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
