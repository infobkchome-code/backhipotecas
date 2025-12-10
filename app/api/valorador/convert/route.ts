import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: Request) {
  const sb = supabaseAdmin();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const leadId = String(body?.id || "");
  if (!leadId) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

  const { data: lead, error: e1 } = await sb
    .from("leads_valorador")
    .select("*")
    .eq("id", leadId)
    .single();

  if (e1 || !lead) return NextResponse.json({ ok: false, error: e1?.message || "Not found" }, { status: 404 });

  const name = lead.name ?? lead.contact?.name ?? null;
  const phone = lead.phone ?? lead.contact?.phone ?? null;
  const email = lead.email ?? lead.contact?.email ?? null;
  const address = lead.address ?? lead.property?.address ?? null;
  const city = lead.city ?? lead.property?.city ?? null;

  // evita duplicar
  const { data: existing } = await sb
    .from("crm_leads")
    .select("id")
    .eq("origin_lead_id", leadId)
    .maybeSingle();

  const crmLeadId = existing?.id
    ? existing.id
    : (await sb.from("crm_leads").insert({
        source: lead.source ?? "bkchome_valorador",
        name,
        phone,
        email,
        address,
        city,
        raw: lead,
        origin_lead_id: leadId,
      }).select("id").single()).data?.id;

  if (!crmLeadId) return NextResponse.json({ ok: false, error: "Could not create crm_leads" }, { status: 500 });

  const { error: e2 } = await sb.from("leads_valorador").update({
    status: "converted",
    crm_lead_id: crmLeadId,
    processed_at: new Date().toISOString(),
  }).eq("id", leadId);

  if (e2) return NextResponse.json({ ok: false, error: e2.message }, { status: 500 });

  return NextResponse.json({ ok: true, crm_lead_id: crmLeadId });
}
