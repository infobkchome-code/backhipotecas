import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, { auth: { persistSession: false } });
}

function buildTitle(lead: any) {
  const city = lead.city ?? lead.property?.city ?? "—";
  const m2 = lead.size_m2 ?? lead.property?.size ?? "";
  const name = lead.name ?? lead.contact?.name ?? "Lead";
  return `Valorador · ${name} · ${city}${m2 ? ` · ${m2}m²` : ""}`;
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

  // 1) carga lead
  const { data: lead, error: e1 } = await sb
    .from("leads_valorador")
    .select("*")
    .eq("id", leadId)
    .single();

  if (e1 || !lead) return NextResponse.json({ ok: false, error: e1?.message || "Not found" }, { status: 404 });

  // si ya está convertido a expediente, devuelve
  if (lead.crm_case_id) {
    return NextResponse.json({ ok: true, case_id: lead.crm_case_id });
  }

  const name = lead.name ?? lead.contact?.name ?? null;
  const phone = lead.phone ?? lead.contact?.phone ?? null;
  const email = lead.email ?? lead.contact?.email ?? null;

  const title = buildTitle(lead);

  // 2) crea expediente (ajusta campos si tu tabla difiere)
  const { data: newCase, error: e2 } = await sb
    .from("seguimiento_casos")
    .insert({
      titulo: title,
      estado: "en_estudio",
      progreso: 10,
      notas: JSON.stringify({
        lead_id: leadId,
        origen: "valorador",
        contacto: { name, phone, email },
        vivienda: lead.property ?? null,
        rango: lead.result ?? { minPrice: lead.result_min, maxPrice: lead.result_max },
        utm: lead.utm ?? null,
      }),
    })
    .select("id")
    .single();

  if (e2 || !newCase?.id) {
    return NextResponse.json({ ok: false, error: e2?.message || "Could not create case" }, { status: 500 });
  }

  // 3) marca lead como convertido y linkea case
  const { error: e3 } = await sb
    .from("leads_valorador")
    .update({
      status: "converted",
      crm_case_id: newCase.id,
      processed_at: new Date().toISOString(),
    })
    .eq("id", leadId);

  if (e3) {
    return NextResponse.json({ ok: false, error: e3.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, case_id: newCase.id });
}
