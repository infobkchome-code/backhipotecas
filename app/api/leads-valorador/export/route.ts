import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  const sb = supabaseAdmin();
  const dest = process.env.CRM_LEADS_TABLE || "crm_leads";

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const id = body?.id as string | undefined;
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

  const { data: lead, error: e1 } = await sb
    .from("leads_valorador")
    .select("*")
    .eq("id", id)
    .single();

  if (e1 || !lead) {
    return NextResponse.json({ ok: false, error: e1?.message || "Lead not found" }, { status: 404 });
  }

  // upsert para no duplicar si se pulsa 2 veces
  const payload = {
    origin_lead_id: lead.id,
    source: lead.source ?? "bkchome_valorador",

    name: lead.name ?? null,
    phone: lead.phone ?? null,
    email: lead.email ?? null,

    address: lead.address ?? null,
    city: lead.city ?? null,
    type: lead.type ?? null,
    size_m2: lead.size_m2 ?? null,
    bedrooms: lead.bedrooms ?? null,
    bathrooms: lead.bathrooms ?? null,
    has_garage: lead.has_garage ?? null,
    has_terrace: lead.has_terrace ?? null,
    condition: lead.condition ?? null,

    result_min: lead.result_min ?? null,
    result_max: lead.result_max ?? null,
    lat: lead.lat ?? null,
    lon: lead.lon ?? null,

    utm: lead.utm ?? {},
    raw: lead.raw ?? null,
  };

  const { error: e2 } = await sb
    .from(dest)
    .upsert(payload, { onConflict: "origin_lead_id" });

  if (e2) {
    return NextResponse.json({ ok: false, error: e2.message }, { status: 500 });
  }

  const { error: e3 } = await sb
    .from("leads_valorador")
    .update({ exported_at: new Date().toISOString(), exported_to: dest })
    .eq("id", id);

  if (e3) {
    return NextResponse.json({ ok: false, error: e3.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
